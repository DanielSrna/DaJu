module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'refactor', 'perf', 'test', 'docs', 'build', 'ci', 'chore', 'revert', 'style']
    ],
    'subject-case': [0, 'never'],
    'header-max-length': [2, 'always', 100]
  }
};
