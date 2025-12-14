#!/usr/bin/env node

/**
 * Multi-run benchmark script
 * Runs the benchmark multiple times and collects statistics
 */

const AI_BRIDGE_URL = process.env.AI_BRIDGE_URL || 'http://localhost:3001';
const ITERATIONS = parseInt(process.argv[2]) || 10;
const MODELS = ['qwen2.5:3b', 'qwen3:8b', 'deepseek-r1:1.5b'];

const TEST_QUERIES = [
  'What are the top 5 products by sales?',
  'Show me the pending orders',
  'What is the current inventory status?',
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

    return { success: true, duration, responseLength: data.message?.length || 0 };
  } catch (error) {
    return { success: false, duration: Date.now() - startTime, error: error.message };
  }
}

async function runSingleBenchmark(iteration) {
  console.log(`\n[${'='.repeat(60)}]`);
  console.log(`ITERATION ${iteration + 1}/${ITERATIONS}`);
  console.log(`[${'='.repeat(60)}]`);
  
  const results = {};
  
  for (const model of MODELS) {
    console.log(`\nTesting ${model}...`);
    const modelResults = [];
    
    for (let i = 0; i < TEST_QUERIES.length; i++) {
      const result = await makeRequest(TEST_QUERIES[i], model);
      modelResults.push(result);
      process.stdout.write(result.success ? '✓' : '✗');
    }
    
    const successful = modelResults.filter(r => r.success);
    const avgDuration = successful.length > 0
      ? successful.reduce((sum, r) => sum + r.duration, 0) / successful.length
      : 0;
    
    results[model] = {
      avgDuration,
      successRate: (successful.length / modelResults.length) * 100,
      results: modelResults
    };
    
    console.log(` ${Math.round(avgDuration)}ms avg`);
  }
  
  return results;
}

async function main() {
  console.log('Multi-Run MCP Model Benchmark');
  console.log('Models:', MODELS.join(', '));
  console.log('Iterations:', ITERATIONS);
  console.log('Queries per model:', TEST_QUERIES.length);
  
  // Check server
  try {
    const health = await fetch(`${AI_BRIDGE_URL}/health`);
    if (!health.ok) throw new Error('Server not responding');
  } catch (error) {
    console.error('\n❌ AI Bridge Server is not running!');
    process.exit(1);
  }
  
  const allRuns = [];
  
  for (let i = 0; i < ITERATIONS; i++) {
    const runResults = await runSingleBenchmark(i);
    allRuns.push(runResults);
  }
  
  // Calculate aggregate statistics
  console.log('\n\n' + '='.repeat(80));
  console.log('AGGREGATE RESULTS');
  console.log('='.repeat(80));
  
  const stats = {};
  
  for (const model of MODELS) {
    const avgTimes = allRuns.map(run => run[model].avgDuration);
    const min = Math.min(...avgTimes);
    const max = Math.max(...avgTimes);
    const mean = avgTimes.reduce((a, b) => a + b, 0) / avgTimes.length;
    const sorted = [...avgTimes].sort((a, b) => a - b);
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];
    
    // Standard deviation
    const variance = avgTimes.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / avgTimes.length;
    const stdDev = Math.sqrt(variance);
    
    stats[model] = { min, max, mean, median, stdDev, allTimes: avgTimes };
  }
  
  // Display table
  console.log('\nModel              | Min      | Max      | Mean     | Median   | Std Dev');
  console.log('-'.repeat(80));
  
  for (const model of MODELS) {
    const s = stats[model];
    console.log(
      `${model.padEnd(18)} | ` +
      `${Math.round(s.min).toString().padStart(8)}ms | ` +
      `${Math.round(s.max).toString().padStart(8)}ms | ` +
      `${Math.round(s.mean).toString().padStart(8)}ms | ` +
      `${Math.round(s.median).toString().padStart(8)}ms | ` +
      `${Math.round(s.stdDev).toString().padStart(7)}ms`
    );
  }
  
  // Determine winner
  const sortedByMean = MODELS.sort((a, b) => stats[a].mean - stats[b].mean);
  const winner = sortedByMean[0];
  
  console.log('\n' + '='.repeat(80));
  console.log('WINNER (by mean):', winner);
  console.log('='.repeat(80));
  
  // Save raw data
  const output = {
    timestamp: new Date().toISOString(),
    iterations: ITERATIONS,
    models: MODELS,
    stats,
    rawData: allRuns
  };
  
  const fs = require('fs');
  fs.writeFileSync('benchmark-results.json', JSON.stringify(output, null, 2));
  console.log('\n✓ Raw data saved to benchmark-results.json');
}

main().catch(console.error);
