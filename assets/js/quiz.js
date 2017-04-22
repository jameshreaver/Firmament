define(['jquery'], 
function($) {

  function Question(question, answer) {
    this.correctAnswer     = answer;
    this.question          = question;
    this.answered          = false;
    this.answeredCorrectly = undefined;
  }

  Question.prototype.answer = function(answer) {
    this.answeredCorrectly = answer.toLowerCase() === this.correctAnswer.toLowerCase();
    this.answered = true;
  }

  function Quiz(conf) {
    this.questions     = this._shuffle(conf.questions);

    this.time 	       = conf.timeLimit;
    this.resultCb      = conf.resultCb;

    this.questionNumber = 0;
    this.total          = this.questions.length;

    if (typeof this.time !== 'undefined') {
      var that = this;
      $(".quiz-circle").html(that.time);

      this.timeInterval = setInterval(function() {
        that.time--;
        $(".quiz-circle").html(that.time);
        if (that.time <= 0.0) {
					that.done();
          clearInterval(that.timeInterval);
        }
      }, 1000);
    }
  }

  Quiz.prototype.getLastQuestion = function() {
    return this.questions[this.questionNumber - 1];
  };

  Quiz.prototype.getCurrentQuestion = function() {
    return this.questions[this.questionNumber];
  };

  Quiz.prototype.getTimeRemaining = function() {
    return (typeof this.time !== 'undefined') ? this.time : "?";
  };

  Quiz.prototype.getTimeInterval = function() {
    return this.timeInterval;
  };

  Quiz.prototype.nextQuestion = function() {
    this.questionNumber++;
    return this;
  };

  Quiz.prototype.answerCurrentQuestion = function(answer) {
    var question = this.questions[this.questionNumber];
    if (question.answered) {
      console.warn("quiz question already answered");
      return;
    }
    question.answer(answer);

    return this;
  };

  Quiz.prototype.done = function() {
    var isCorrect = function(question) {
      return question.answeredCorrectly;
    }
    var correct = this.questions.filter(isCorrect).length;
    var percent = (correct / this.total);
    var result  = {
      correct: correct,
      total: this.total,
      percent: percent,
      pass: percent > 0.70
    };

    this.resultCb(result);

    return result;
  };

  Quiz.prototype.isFinished = function() {
    return this.questionNumber >= this.total || (this.time && this.time < 0);
  };

  Quiz.prototype._shuffle = function(array) {
    for (var i = array.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }
    return array;
  };

  return {
    Question: Question,
    Quiz: Quiz
  };

});
