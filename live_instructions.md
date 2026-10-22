✖ failing tests:

test at tests/discover-filters.test.mjs:470:1
✖ Mock Baseline Coverage: All 7 mock stories render and filter correctly under All Stories (0.538917ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  
  8 !== 7
  
      at TestContext.<anonymous> (file:///Users/syedabbasmuttaqizaidi/Desktop/development/stories-by-relay/tests/discover-filters.test.mjs:481:10)
      at Test.runInAsyncScope (node:async_hooks:214:14)
      at Test.run (node:internal/test_runner/test:1047:25)
      at Test.processPendingSubtests (node:internal/test_runner/test:744:18)
      at Test.postRun (node:internal/test_runner/test:1173:19)
      at Test.run (node:internal/test_runner/test:1101:12)
      at async Test.processPendingSubtests (node:internal/test_runner/test:744:7) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: 8,
    expected: 7,
    operator: 'strictEqual',
    diff: 'simple'
  }

test at tests/discover-filters.test.mjs:555:1
✖ Combined Dataset: Real DB stories and mock stories coexist and deduplicate by ID (0.153958ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  
  9 !== 8
  
      at TestContext.<anonymous> (file:///Users/syedabbasmuttaqizaidi/Desktop/development/stories-by-relay/tests/discover-filters.test.mjs:584:10)
      at Test.runInAsyncScope (node:async_hooks:214:14)
      at Test.run (node:internal/test_runner/test:1047:25)
      at Test.processPendingSubtests (node:internal/test_runner/test:744:18)
      at Test.postRun (node:internal/test_runner/test:1173:19)
      at Test.run (node:internal/test_runner/test:1101:12)
      at async Test.processPendingSubtests (node:internal/test_runner/test:744:7) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: 9,
    expected: 8,
    operator: 'strictEqual',
    diff: 'simple'
  }

❌ Push rejected: Automated unit tests failed!
Please fix the failing tests before pushing.
error: failed to push some refs to 'github.com:abbasmuttaqizaidi/tellnest.git'