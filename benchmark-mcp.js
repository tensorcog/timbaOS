#!/usr/bin/env node

/**
 * MCP Model Benchmark Script
 * Compares performance between qwen2.5:3b and qwen3:8b models
 * Makes 3 requests to each model and measures response times
 */

const AI_BRIDGE_URL = process.env.AI_BRIDGE_URL || 'http://localhost:3001';

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
        model: model, // Override the model
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

// Function to display comparison
function displayComparison(model1Name, model1Stats, model2Name, model2Stats) {
  console.log('\n' + '='.repeat(60));
  console.log('BENCHMARK COMPARISON');
  console.log('='.repeat(60));

  console.log(`\n${'Metric'.padEnd(30)} | ${model1Name.padEnd(12)} | ${model2Name.padEnd(12)}`);
  console.log('-'.repeat(60));

  console.log(
    `${'Success Rate'.padEnd(30)} | ${model1Stats.successRate.toFixed(1).padEnd(12)}% | ${model2Stats.successRate.toFixed(1).padEnd(12)}%`
  );
  console.log(
    `${'Avg Duration'.padEnd(30)} | ${model1Stats.avgDuration.toFixed(0).padEnd(12)}ms | ${model2Stats.avgDuration.toFixed(0).padEnd(12)}ms`
  );
  console.log(
    `${'Min Duration'.padEnd(30)} | ${model1Stats.minDuration.toFixed(0).padEnd(12)}ms | ${model2Stats.minDuration.toFixed(0).padEnd(12)}ms`
  );
  console.log(
    `${'Max Duration'.padEnd(30)} | ${model1Stats.maxDuration.toFixed(0).padEnd(12)}ms | ${model2Stats.maxDuration.toFixed(0).padEnd(12)}ms`
  );
  console.log(
    `${'Total Duration'.padEnd(30)} | ${model1Stats.totalDuration.toFixed(0).padEnd(12)}ms | ${model2Stats.totalDuration.toFixed(0).padEnd(12)}ms`
  );

  // Determine winner
  console.log('\n' + '='.repeat(60));
  console.log('RESULTS:');
  console.log('='.repeat(60));

  if (model1Stats.avgDuration < model2Stats.avgDuration) {
    const speedup = ((model2Stats.avgDuration - model1Stats.avgDuration) / model2Stats.avgDuration * 100).toFixed(1);
    console.log(`\n🏆 ${model1Name} is FASTER by ${speedup}%`);
  } else if (model2Stats.avgDuration < model1Stats.avgDuration) {
    const speedup = ((model1Stats.avgDuration - model2Stats.avgDuration) / model1Stats.avgDuration * 100).toFixed(1);
    console.log(`\n🏆 ${model2Name} is FASTER by ${speedup}%`);
  } else {
    console.log('\n🤝 Both models have equal performance');
  }

  console.log('='.repeat(60) + '\n');
}

// Main benchmark function
async function main() {
  console.log('MCP Model Benchmark');
  console.log('Testing AI Bridge Server at:', AI_BRIDGE_URL);
  console.log('Number of requests per model:', TEST_QUERIES.length);

  try {
    // Check if server is running
    const healthCheck = await fetch(`${AI_BRIDGE_URL}/health`).catch(() => null);
    if (!healthCheck || !healthCheck.ok) {
      console.error('\n❌ ERROR: AI Bridge Server is not running!');
      console.error('Please start the server with: cd ai-bridge-server && node index.js');
      process.exit(1);
    }

    // Benchmark both models
    const model1 = 'qwen2.5:3b';
    const model2 = 'qwen3:8b';

    const model1Results = await benchmarkModel(model1);
    const model2Results = await benchmarkModel(model2);

    // Calculate statistics
    const model1Stats = calculateStats(model1Results);
    const model2Stats = calculateStats(model2Results);

    // Display comparison
    displayComparison(model1, model1Stats, model2, model2Stats);
  } catch (error) {
    console.error('\n❌ Benchmark failed:', error.message);
    process.exit(1);
  }
}

// Run the benchmark
main();
