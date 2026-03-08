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
        }
    },
    methods: {
        async loadTests() {
            try {
                const response = await fetch('tests.json');
                const data = await response.json();
                this.tests = data.tests;
            } catch (error) {
                console.error('Помилка завантаження тестів:', error);
            }
        },
        selectTest(test) {
            this.selectedTest = test;
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
            this.currentQuestionIndex = 0;
            this.answerSelected = false;
            this.selectedAnswerIndex = null;
            this.showError = false;
        },
        submitName() {
            if (this.userName.trim()) {
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
