class RuleExample {
  final String correct;
  final String? incorrect;
  final String? comment;

  RuleExample({required this.correct, this.incorrect, this.comment});

  factory RuleExample.fromJson(Map<String, dynamic> j) => RuleExample(
    correct: j['correct'] ?? '',
    incorrect: j['incorrect'],
    comment: j['comment'],
  );
}

class Rule {
  final int id;
  final String topic;
  final String? subtopic;
  final String title;
  final String explanation;
  final List<RuleExample> examples;

  Rule({required this.id, required this.topic, this.subtopic, required this.title, required this.explanation, required this.examples});

  factory Rule.fromJson(Map<String, dynamic> j) => Rule(
    id: j['id'],
    topic: j['topic'] ?? '',
    subtopic: j['subtopic'],
    title: j['title'] ?? '',
    explanation: j['explanation'] ?? '',
    examples: (j['examples'] as List<dynamic>? ?? []).map((e) => RuleExample.fromJson(e)).toList(),
  );
}
