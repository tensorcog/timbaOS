#!/usr/bin/env node

/**
 * Accuracy/Quality Benchmark
 * Tests correctness and quality of model responses
 * 4 iterations per model
 */

const AI_BRIDGE_URL = process.env.AI_BRIDGE_URL || 'http://localhost:3001';
const ITERATIONS = 4;
const MODELS = ['qwen2.5:3b', 'qwen3:8b', 'deepseek-r1:1.5b'];

// Test queries with expected behaviors
const QUALITY_TESTS = [
  {
    query: 'How many pending orders are there?',
    expectedTool: 'get_orders',
    shouldContain: ['pending', 'order'],
    shouldNotContain: ['error', 'undefined', 'null'],
    checkNumeric: true, // Should contain a number
  },
  {
    query: 'What are the top 3 selling products?',
    expectedTool: 'get_analytics',
    shouldContain: ['product', 'sales'],
    shouldNotContain: ['sorry', 'cannot', 'unable'],
    checkList: true, // Should list products
  },
  {
    query: 'Show me customer information for the most recent order',
    expectedTool: 'get_orders',
    shouldContain: ['customer', 'name', 'email'],
    shouldNotContain: ['error', 'not found'],
    checkData: true,
  },
  {
    query: 'What items are below reorder point?',
    expectedTool: 'get_low_stock_alerts',
    shouldContain: ['stock', 'low', 'reorder'],
    shouldNotContain: ['none', 'no items'],
    checkList: true,
  },
];

async function makeRequest(query, model) {
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${AI_BRIDGE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: query, model: model }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    const duration = Date.now() - startTime;

    return { 
      success: true, 
      duration, 
      message: data.message || '',
      raw: data
    };
  } catch (error) {
    return { 
      success: false, 
      duration: Date.now() - startTime, 
      error: error.message,
      message: ''
    };
  }
}

function scoreResponse(response, test) {
  const msg = response.message.toLowerCase();
  let score = 0;
  const issues = [];

  // Check if response succeeded
  if (!response.success) {
    issues.push('Request failed');
    return { score: 0, issues };
  }

  // Base score for successful response
  score += 20;

  // Check required content
  const containsAll = test.shouldContain.every(term => msg.includes(term.toLowerCase()));
  if (containsAll) {
    score += 30;
  } else {
    const missing = test.shouldContain.filter(term => !msg.includes(term.toLowerCase()));
    issues.push(`Missing terms: ${missing.join(', ')}`);
  }

  // Check for bad content
  const hasBad = test.shouldNotContain.some(term => msg.includes(term.toLowerCase()));
  if (!hasBad) {
    score += 20;
  } else {
    const found = test.shouldNotContain.filter(term => msg.includes(term.toLowerCase()));
    issues.push(`Contains bad terms: ${found.join(', ')}`);
  }

  // Check for numeric data if expected
  if (test.checkNumeric) {
    const hasNumber = /\d+/.test(msg);
    if (hasNumber) {
      score += 15;
    } else {
      issues.push('No numeric data found');
    }
  }

  // Check for list/structured data
  if (test.checkList || test.checkData) {
    // Look for common list patterns
    const hasStructure = msg.includes('\n') || msg.includes(',') || msg.includes('1.') || msg.includes('-');
    if (hasStructure) {
      score += 15;
    } else {
      issues.push('No structured data found');
    }
  }

  // Bonus for reasonable length (not too short, not verbose)
  const wordCount = msg.split(/\s+/).length;
  if (wordCount >= 20 && wordCount <= 500) {
    score += 10;
  } else if (wordCount < 20) {
    issues.push('Response too short');
  } else {
    issues.push('Response too verbose');
  }

  return { score: Math.min(score, 100), issues };
}

async function runQualityBenchmark(model, iteration) {
  console.log(`\n[Model: ${model} | Iteration ${iteration + 1}/${ITERATIONS}]`);
  
  const results = [];
  
  for (let i = 0; i < QUALITY_TESTS.length; i++) {
    const test = QUALITY_TESTS[i];
    process.stdout.write(`  Q${i + 1}: "${test.query.substring(0, 40)}..." `);
    
    const response = await makeRequest(test.query, model);
    const { score, issues } = scoreResponse(response, test);
    
    results.push({
      query: test.query,
      score,
      issues,
      duration: response.duration,
      responseLength: response.message.length
    });
    
    const emoji = score >= 80 ? '✓' : score >= 60 ? '○' : '✗';
    console.log(`${emoji} ${score}/100`);
    if (issues.length > 0 && score < 80) {
      console.log(`     Issues: ${issues.join('; ')}`);
    }
  }
  
  const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
  return { results, avgScore };
}

async function main() {
  console.log('Model Accuracy & Quality Benchmark');
  console.log('Models:', MODELS.join(', '));
  console.log('Iterations:', ITERATIONS);
  console.log('Test queries:', QUALITY_TESTS.length);
  
  // Check server
  try {
    const health = await fetch(`${AI_BRIDGE_URL}/health`);
    if (!health.ok) throw new Error('Server not responding');
  } catch (error) {
    console.error('\n❌ AI Bridge Server is not running!');
    process.exit(1);
  }
  
  const modelStats = {};
  
  for (const model of MODELS) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`TESTING: ${model}`);
    console.log('='.repeat(70));
    
    const iterationScores = [];
    
    for (let i = 0; i < ITERATIONS; i++) {
      const { results, avgScore } = await runQualityBenchmark(model, i);
      iterationScores.push(avgScore);
    }
    
    const mean = iterationScores.reduce((a, b) => a + b) / iterationScores.length;
    const min = Math.min(...iterationScores);
    const max = Math.max(...iterationScores);
    
    modelStats[model] = { mean, min, max, scores: iterationScores };
    
    console.log(`\n  Average Quality Score: ${mean.toFixed(1)}/100`);
  }
  
  // Final comparison
  console.log('\n\n' + '='.repeat(70));
  console.log('QUALITY COMPARISON');
  console.log('='.repeat(70));
  
  console.log('\nModel              | Mean Score | Min   | Max   | Rating');
  console.log('-'.repeat(70));
  
  for (const model of MODELS) {
    const s = modelStats[model];
    const rating = s.mean >= 80 ? 'Excellent' : s.mean >= 70 ? 'Good' : s.mean >= 60 ? 'Fair' : 'Poor';
    console.log(
      `${model.padEnd(18)} | ` +
      `${s.mean.toFixed(1).padStart(10)} | ` +
      `${s.min.toFixed(1).padStart(5)} | ` +
      `${s.max.toFixed(1).padStart(5)} | ` +
      rating
    );
  }
  
  // Determine winner
  const sortedByQuality = MODELS.sort((a, b) => modelStats[b].mean - modelStats[a].mean);
  const winner = sortedByQuality[0];
  
  console.log('\n' + '='.repeat(70));
  console.log(`🏆 HIGHEST QUALITY: ${winner} (${modelStats[winner].mean.toFixed(1)}/100)`);
  console.log('='.repeat(70));
  
  // Save results
  const fs = require('fs');
  fs.writeFileSync('quality-results.json', JSON.stringify({
    timestamp: new Date().toISOString(),
    iterations: ITERATIONS,
    models: MODELS,
    stats: modelStats
  }, null, 2));
  
  console.log('\n✓ Results saved to quality-results.json\n');
}

main().catch(console.error);
