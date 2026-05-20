class TestOption {
  final int id;
  final String text;
  final bool isCorrect;
  TestOption({required this.id, required this.text, required this.isCorrect});
  factory TestOption.fromJson(Map<String, dynamic> j) => TestOption(
    id: j['id'], text: j['text'], isCorrect: j['is_correct'] ?? false,
  );
}

class TestQuestion {
  final int id;
  final String text;
  final int? ruleId;
  final List<TestOption> options;
  TestQuestion({required this.id, required this.text, this.ruleId, required this.options});
  factory TestQuestion.fromJson(Map<String, dynamic> j) => TestQuestion(
    id: j['id'], text: j['text'], ruleId: j['rule_id'],
    options: (j['options'] as List).map((o) => TestOption.fromJson(o)).toList(),
  );
}

class Test {
  final int id;
  final String title, category, difficulty;
  final int timerSeconds;
  final bool isPublished;
  final List<TestQuestion> questions;
  Test({required this.id, required this.title, required this.category, required this.difficulty, required this.timerSeconds, required this.isPublished, required this.questions});
  factory Test.fromJson(Map<String, dynamic> j) => Test(
    id: j['id'], title: j['title'], category: j['category'],
    difficulty: j['difficulty'], timerSeconds: j['timer_seconds'],
    isPublished: j['is_published'] ?? false,
    questions: (j['questions'] as List? ?? []).map((q) => TestQuestion.fromJson(q)).toList(),
  );
}
