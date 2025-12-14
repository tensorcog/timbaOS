#!/usr/bin/env node

/**
 * Flexible MCP Model Benchmark Script
 * Usage: node benchmark-model.js <model1> [model2] [model3] ...
 * Example: node benchmark-model.js qwen2.5:3b deepseek-r1:1.5b
 */

const AI_BRIDGE_URL = process.env.AI_BRIDGE_URL || 'http://localhost:3001';

// Get models from command line arguments
const models = process.argv.slice(2);

if (models.length === 0) {
  console.error('Error: Please specify at least one model to benchmark');
  console.error('Usage: node benchmark-model.js <model1> [model2] ...');
  console.error('Example: node benchmark-model.js qwen2.5:3b deepseek-r1:1.5b qwen3:8b');
  process.exit(1);
}

// Test queries that will use MCP tools
const TEST_QUERIES = [
  'What are the top 5 products by sales?',
  'Show me the pending orders',
  'What is the current inventory status?',
];

// Function to make a single request and measure time
async function makeRequest(query, model) {
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${AI_BRIDGE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: query,
        model: model,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const endTime = Date.now();
    const duration = endTime - startTime;

    return {
      success: true,
      duration,
      query,
      responseLength: data.message?.length || 0,
    };
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;

    return {
      success: false,
      duration,
      query,
      error: error.message,
    };
  }
}

// Function to benchmark a model
async function benchmarkModel(modelName) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Benchmarking Model: ${modelName}`);
  console.log('='.repeat(60));

  const results = [];

  for (let i = 0; i < TEST_QUERIES.length; i++) {
    const query = TEST_QUERIES[i];
    console.log(`\nRequest ${i + 1}/${TEST_QUERIES.length}: "${query}"`);
    
    const result = await makeRequest(query, modelName);
    results.push(result);

    if (result.success) {
      console.log(`✓ Success - Duration: ${result.duration}ms`);
      console.log(`  Response length: ${result.responseLength} chars`);
    } else {
      console.log(`✗ Failed - Duration: ${result.duration}ms`);
      console.log(`  Error: ${result.error}`);
    }
  }

  return results;
}

// Function to calculate statistics
function calculateStats(results) {
  const successfulResults = results.filter((r) => r.success);
  const durations = successfulResults.map((r) => r.duration);

  if (durations.length === 0) {
    return {
      successRate: 0,
      avgDuration: 0,
      minDuration: 0,
      maxDuration: 0,
      totalDuration: 0,
    };
  }

  return {
    successRate: (successfulResults.length / results.length) * 100,
    avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
    minDuration: Math.min(...durations),
    maxDuration: Math.max(...durations),
    totalDuration: durations.reduce((a, b) => a + b, 0),
  };
}

// Function to display comparison table
function displayComparison(modelStats) {
  console.log('\n' + '='.repeat(80));
  console.log('BENCHMARK COMPARISON');
  console.log('='.repeat(80));

  // Header
  const modelNames = Object.keys(modelStats);
  const header = 'Metric'.padEnd(25) + ' | ' + modelNames.map(m => m.padEnd(15)).join(' | ');
  console.log(`\n${header}`);
  console.log('-'.repeat(header.length));

  // Metrics
  const metrics = ['successRate', 'avgDuration', 'minDuration', 'maxDuration', 'totalDuration'];
  const labels = ['Success Rate (%)', 'Avg Duration (ms)', 'Min Duration (ms)', 'Max Duration (ms)', 'Total Duration (ms)'];

  for (let i = 0; i < metrics.length; i++) {
    const metric = metrics[i];
    const label = labels[i];
    const values = modelNames.map(name => {
      const val = modelStats[name][metric];
      if (metric === 'successRate') {
        return val.toFixed(1).padEnd(15);
      }
      return Math.round(val).toString().padEnd(15);
    });
    console.log(`${label.padEnd(25)} | ${values.join(' | ')}`);
  }

  // Find winner (fastest average)
  console.log('\n' + '='.repeat(80));
  console.log('RESULTS:');
  console.log('='.repeat(80));

  if (modelNames.length > 1) {
    const sorted = modelNames.sort((a, b) => modelStats[a].avgDuration - modelStats[b].avgDuration);
    const winner = sorted[0];
    const winnerAvg = modelStats[winner].avgDuration;
    
    console.log(`\n🏆 WINNER: ${winner} (${Math.round(winnerAvg)}ms avg)`);
    console.log('\nPerformance vs Winner:');
    
    for (const model of sorted) {
      const avg = modelStats[model].avgDuration;
      if (model === winner) {
        console.log(`  ${model}: 100.0% (baseline)`);
      } else {
        const slower = ((avg - winnerAvg) / winnerAvg * 100).toFixed(1);
        console.log(`  ${model}: ${slower}% slower`);
      }
    }
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

// Main benchmark function
async function main() {
  console.log('Flexible MCP Model Benchmark');
  console.log('Testing AI Bridge Server at:', AI_BRIDGE_URL);
  console.log('Models to test:', models.join(', '));
  console.log('Number of requests per model:', TEST_QUERIES.length);

  try {
    // Check if server is running
    const healthCheck = await fetch(`${AI_BRIDGE_URL}/health`).catch(() => null);
    if (!healthCheck || !healthCheck.ok) {
      console.error('\n❌ ERROR: AI Bridge Server is not running!');
      console.error('Please start the server with: cd ai-bridge-server && node index.js');
      process.exit(1);
    }

    // Benchmark all models
    const allStats = {};
    for (const model of models) {
      const results = await benchmarkModel(model);
      allStats[model] = calculateStats(results);
    }

    // Display comparison
    displayComparison(allStats);
  } catch (error) {
    console.error('\n❌ Benchmark failed:', error.message);
    process.exit(1);
  }
}

// Run the benchmark
main();
