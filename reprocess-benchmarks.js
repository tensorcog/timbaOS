#!/usr/bin/env node

/**
 * Reprocess benchmark results excluding the first prompt (warmup)
 */

const fs = require('fs');

// Load speed benchmark results
const speedResults = JSON.parse(fs.readFileSync('benchmark-results.json', 'utf8'));

// Load quality benchmark results  
const qualityResults = JSON.parse(fs.readFileSync('quality-results.json', 'utf8'));

console.log('Reprocessing benchmarks, excluding first prompt from each iteration...\n');

// === PROCESS SPEED BENCHMARKS ===
console.log('Processing Speed Benchmarks...');
const newSpeedStats = {};

for (const model of speedResults.models) {
  const allTimes = [];
  
  // For each iteration, exclude the first of 3 results
  speedResults.rawData.forEach(iteration => {
    const modelData = iteration[model];
    if (modelData && modelData.results) {
      // Skip first result (index 0), keep results 1 and 2
      const filteredResults = modelData.results.slice(1);
      const avgDuration = filteredResults.reduce((sum, r) => sum + r.duration, 0) / filteredResults.length;
      allTimes.push(avgDuration);
    }
  });
  
  newSpeedStats[model] = {
    min: Math.min(...allTimes),
    max: Math.max(...allTimes),
    mean: allTimes.reduce((a, b) => a + b) / allTimes.length,
    median: allTimes.sort((a, b) => a - b)[Math.floor(allTimes.length / 2)],
    stdDev: calculateStdDev(allTimes),
    allTimes: allTimes
  };
  
  console.log(`  ${model}: ${allTimes.length} iterations processed`);
}

// === PROCESS QUALITY BENCHMARKS ===
console.log('\nProcessing Quality Benchmarks...');
const newQualityStats = {};

// Quality benchmark has 4 test queries per iteration
// We need to exclude the first query's results from each iteration
// Since quality-results.json doesn't have raw iteration data, we need to recalculate from scores
// The scores array has all 4 scores - we'll remove every 4th starting from 0

for (const model of qualityResults.models) {
  const stats = qualityResults.stats[model];
  const originalScores = stats.scores;
  
  // We have 4 iterations, each with 1 average score
  // But these averages include all 4 test queries
  // We can't retroactively remove individual query scores without raw data
  // So we'll note this limitation
  
  newQualityStats[model] = {
    mean: stats.mean,
    min: stats.min,
    max: stats.max,
    scores: stats.scores,
    note: "Quality scores are iteration averages - cannot exclude individual queries without raw data"
  };
}

function calculateStdDev(values) {
  const mean = values.reduce((a, b) => a + b) / values.length;
  const squareDiffs = values.map(value => Math.pow(value - mean, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b) / squareDiffs.length;
  return Math.sqrt(avgSquareDiff);
}

// Save new results
const newSpeedBenchmark = {
  timestamp: new Date().toISOString(),
  note: "Reprocessed from original data, excluding first prompt from each iteration",
  iterations: speedResults.iterations,
  models: speedResults.models,
  stats: newSpeedStats
};

const newQualityBenchmark = {
  timestamp: new Date().toISOString(),
  note: "Quality benchmark iteration averages - first prompt exclusion not applicable to aggregated data",
  iterations: qualityResults.iterations,
  models: qualityResults.models,
  stats: newQualityStats
};

fs.writeFileSync('benchmark-results-filtered.json', JSON.stringify(newSpeedBenchmark, null, 2));
fs.writeFileSync('quality-results-filtered.json', JSON.stringify(newQualityBenchmark, null, 2));

console.log('\n' + '='.repeat(70));
console.log('SPEED BENCHMARK RESULTS (First Prompt Excluded)');
console.log('='.repeat(70));
console.log('\nModel              | Mean (ms) | Min (ms) | Max (ms) | Median (ms)');
console.log('-'.repeat(70));

for (const model of speedResults.models) {
  const s = newSpeedStats[model];
  console.log(
    `${model.padEnd(18)} | ` +
    `${Math.round(s.mean).toString().padStart(9)} | ` +
    `${Math.round(s.min).toString().padStart(8)} | ` +
    `${Math.round(s.max).toString().padStart(8)} | ` +
    `${Math.round(s.median).toString().padStart(11)}`
  );
}

// Determine speed winner
const sortedBySpeed = speedResults.models.sort((a, b) => newSpeedStats[a].mean - newSpeedStats[b].mean);
const speedWinner = sortedBySpeed[0];

console.log('\n' + '='.repeat(70));
console.log(`🏆 FASTEST: ${speedWinner} (${Math.round(newSpeedStats[speedWinner].mean)}ms avg)`);
console.log('='.repeat(70));

// Compare before/after
console.log('\n' + '='.repeat(70));
console.log('COMPARISON: Original vs Filtered (First Prompt Removed)');
console.log('='.repeat(70));
console.log('\nModel              | Original Mean | Filtered Mean | Difference');
console.log('-'.repeat(70));

for (const model of speedResults.models) {
  const originalMean = speedResults.stats[model].mean;
  const filteredMean = newSpeedStats[model].mean;
  const diff = originalMean - filteredMean;
  const diffPercent = ((diff / originalMean) * 100).toFixed(1);
  
  console.log(
    `${model.padEnd(18)} | ` +
    `${Math.round(originalMean).toString().padStart(13)} | ` +
    `${Math.round(filteredMean).toString().padStart(13)} | ` +
    `${diff >= 0 ? '-' : '+'}${Math.abs(Math.round(diff)).toString().padStart(4)}ms (${diffPercent}%)`
  );
}

console.log('\n✓ Results saved to:');
console.log('  - benchmark-results-filtered.json');
console.log('  - quality-results-filtered.json\n');
