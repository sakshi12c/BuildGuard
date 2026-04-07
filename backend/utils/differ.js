function analyzeHashes(hash1, hash2, isReproducible, score) {

  if (isReproducible) {
    return {
      identical: true,
      differences: [],
      message: 'Both builds are perfectly identical! Your C program is fully reproducible.',
      causes: []
    };
  }

  // Score-based cause analysis
  const causes = [];

  if (score < 60) {
    causes.push({
      cause: 'Embedded Timestamps',
      icon: '🕐',
      description: 'The compiler embedded different build timestamps in each output. This is the most common cause of non-reproducibility in C.',
      severity: 'High',
      fix: 'Avoid using __DATE__ or __TIME__ macros in your C code'
    });
    causes.push({
      cause: 'Debug Symbol Paths',
      icon: '📂',
      description: 'Absolute file paths in debug symbols differ between builds if compiled in different directories.',
      severity: 'High',
      fix: 'Use -fdebug-prefix-map flag or compile from a fixed path'
    });
  }

  if (score < 85) {
    causes.push({
      cause: 'File Processing Order',
      icon: '🔀',
      description: 'The operating system may have listed source files in a different order, causing slightly different object file layouts.',
      severity: 'Medium',
      fix: 'Sort file lists explicitly in your Makefile or build script'
    });
    causes.push({
      cause: 'Compiler Optimisation Randomness',
      icon: '⚙️',
      description: 'Some compiler optimisation passes use internal counters or random seeds that vary between runs.',
      severity: 'Medium',
      fix: 'Pin your compiler version and use -frandom-seed=<fixed_value> flag'
    });
  }

  causes.push({
    cause: 'Environment Variables Baked In',
    icon: '🌍',
    description: 'System paths, usernames, or environment variables may have been included in the binary during linking.',
    severity: 'Low',
    fix: 'Use a clean Docker container with a fixed environment for all builds'
  });

  return {
    identical: false,
    differences: causes,
    message: 'Builds are different! Possible causes have been identified below.',
    causes
  };
}

module.exports = { analyzeHashes };