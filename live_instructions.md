✖ failing tests:

test at tests/global-search.test.mjs:260:1
✖ Author Mode: Offline/Mock fallback returns valid author results with id and handle (136.955833ms)
  AssertionError [ERR_ASSERTION]: Author search must return matching mock authors when DB is unavailable
      at TestContext.<anonymous> (file:///Users/syedabbasmuttaqizaidi/Desktop/development/stories-by-relay/tests/global-search.test.mjs:265:10)
      at process.processTicksAndRejections (node:internal/process/task_queues:103:5)
      at async Test.run (node:internal/test_runner/test:1054:7)
      at async Test.processPendingSubtests (node:internal/test_runner/test:744:7) {
    generatedMessage: false,
    code: 'ERR_ASSERTION',
    actual: false,
    expected: true,
    operator: '==',
    diff: 'simple'
  }

test at tests/global-search.test.mjs:360:1
✖ Questionnaire Recommendations: Dynamically scores and returns recommendations from DB catalog (332.119166ms)
  AssertionError [ERR_ASSERTION]: A Winter in Kyoto should be recommended for quiet mood
      at TestContext.<anonymous> (file:///Users/syedabbasmuttaqizaidi/Desktop/development/stories-by-relay/tests/global-search.test.mjs:372:10)
      at process.processTicksAndRejections (node:internal/process/task_queues:103:5)
      at async Test.run (node:internal/test_runner/test:1054:7)
      at async Test.processPendingSubtests (node:internal/test_runner/test:744:7) {
    generatedMessage: false,
    code: 'ERR_ASSERTION',
    actual: false,
    expected: true,
    operator: '==',
    diff: 'simple'
  }

test at tests/library-backend.test.mjs:69:1
✖ Library Backend: executeGetCompactLibraryWorks falls back gracefully to platform catalog (0.489792ms)
  AssertionError [ERR_ASSERTION]: Should fall back to platform catalog
      at TestContext.<anonymous> (file:///Users/syedabbasmuttaqizaidi/Desktop/development/stories-by-relay/tests/library-backend.test.mjs:74:10)
      at async Test.run (node:internal/test_runner/test:1054:7)
      at async Test.processPendingSubtests (node:internal/test_runner/test:744:7) {
    generatedMessage: false,
    code: 'ERR_ASSERTION',
    actual: false,
    expected: true,
    operator: '==',
    diff: 'simple'
  }

test at tests/library-backend.test.mjs:156:1
✖ Library Backend: executeGetLibraryWorkDetail falls back gracefully to catalog when work not in DB (10158.351083ms)
  AssertionError [ERR_ASSERTION]: Should resolve catalog work
      at TestContext.<anonymous> (file:///Users/syedabbasmuttaqizaidi/Desktop/development/stories-by-relay/tests/library-backend.test.mjs:159:10)
      at process.processTicksAndRejections (node:internal/process/task_queues:103:5)
      at async Test.run (node:internal/test_runner/test:1054:7)
      at async Test.processPendingSubtests (node:internal/test_runner/test:744:7) {
    generatedMessage: false,
    code: 'ERR_ASSERTION',
    actual: null,
    expected: true,
    operator: '==',
    diff: 'simple'
  }

❌ Push rejected: Automated unit tests failed!
Please fix the failing tests before pushing.
error: failed to push some refs to 'github.com:abbasmuttaqizaidi/tellnest.git'