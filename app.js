const { createApp } = Vue;

createApp({
    data() {
        return {
            tests: [],
            currentView: 'testSelection', // testSelection, testing, nameInput, success
            selectedTest: null,
            currentQuestionIndex: 0,
            answerSelected: false,
            selectedAnswerIndex: null,
            showError: false,
            userName: ''
        };
    },
    computed: {
        currentQuestion() {
            if (!this.selectedTest) return null;
            return this.selectedTest.questions[this.currentQuestionIndex];
        },
        isLastQuestion() {
            if (!this.selectedTest) return false;
            return this.currentQuestionIndex === this.selectedTest.questions.length - 1;
        },
        currentDate() {
            const today = new Date();
            const day = String(today.getDate()).padStart(2, '0');
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const year = today.getFullYear();
            return `${day}.${month}.${year}`;
        }
    },
    methods: {
        shuffleAnswers(question) {
            // Зберігаємо правильну відповідь
            const correctAnswer = question.answers[question.correctAnswer];
            
            // Перемішуємо відповіді (Fisher-Yates shuffle)
            const shuffled = [...question.answers];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            
            // Оновлюємо масив і знаходимо новий індекс правильної відповіді
            question.answers = shuffled;
            question.correctAnswer = shuffled.indexOf(correctAnswer);
        },
        async loadTests() {
            try {
                const response = await fetch('tests.json');
                const data = await response.json();
                
                // Автоматично генеруємо id для кожного питання
                this.tests = data.tests.map(test => ({
                    ...test,
                    questions: test.questions.map((question, index) => ({
                        id: index + 1,
                        ...question
                    }))
                }));
            } catch (error) {
                console.error('Помилка завантаження тестів:', error);
            }
        },
        selectTest(test) {
            // Клонуємо тест щоб не змінювати оригінал
            this.selectedTest = JSON.parse(JSON.stringify(test));
            
            // Перемішуємо відповіді для всіх питань
            this.selectedTest.questions.forEach(question => {
                this.shuffleAnswers(question);
            });
            
            this.currentQuestionIndex = 0;
            this.answerSelected = false;
            this.selectedAnswerIndex = null;
            this.showError = false;
            this.currentView = 'testing';
        },
        selectAnswer(index) {
            if (this.answerSelected) return;
            
            this.answerSelected = true;
            this.selectedAnswerIndex = index;
            
            // Перевірка відповіді
            if (index !== this.currentQuestion.correctAnswer) {
                this.showError = true;
            }
        },
        getAnswerClass(index) {
            if (!this.answerSelected) {
                return 'bg-gray-100 hover:bg-indigo-100 text-gray-800 border-2 border-gray-300';
            }
            
            // Якщо це правильна відповідь
            if (index === this.currentQuestion.correctAnswer) {
                return 'bg-green-500 text-white border-2 border-green-600';
            }
            
            // Якщо це вибрана неправильна відповідь
            if (index === this.selectedAnswerIndex) {
                return 'bg-red-500 text-white border-2 border-red-600';
            }
            
            // Інші відповіді
            return 'bg-gray-100 text-gray-800 border-2 border-gray-300';
        },
        nextQuestion() {
            if (this.isLastQuestion) {
                this.currentView = 'nameInput';
            } else {
                this.currentQuestionIndex++;
                this.answerSelected = false;
                this.selectedAnswerIndex = null;
            }
        },
        restartTest() {
            // Перемішуємо відповіді знову
            this.selectedTest.questions.forEach(question => {
                this.shuffleAnswers(question);
            });
            
            this.currentQuestionIndex = 0;
            this.answerSelected = false;
            this.selectedAnswerIndex = null;
            this.showError = false;
        },
        submitName() {
            if (this.userName.trim()) {
                // Зберігаємо результат на сервері
                fetch('/api/save-result', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: this.userName,
                        testName: this.selectedTest.name
                    })
                }).catch(error => {
                    console.error('Помилка збереження результату:', error);
                });
                
                this.currentView = 'success';
            }
        },
        backToTests() {
            this.currentView = 'testSelection';
            this.selectedTest = null;
            this.currentQuestionIndex = 0;
            this.userName = '';
            this.answerSelected = false;
            this.selectedAnswerIndex = null;
            this.showError = false;
        }
    },
    mounted() {
        this.loadTests();
    }
}).mount('#app');
