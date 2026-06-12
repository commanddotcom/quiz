const { createApp } = Vue;

createApp({
    data() {
        return {
            // navigation
            currentView: 'home', // home, auth, lessons, lesson, testSelection, testing, results, nameInput, success
            pendingSection: null,
            pendingLessonId: null,
            // auth
            authToken: localStorage.getItem('authToken') || null,
            authCallsign: localStorage.getItem('authCallsign') || '',
            authCallsignInput: '',
            authPassword: '',
            authError: '',
            // lessons
            lessonsList: [],
            currentLesson: null,
            // tests
            tests: [],
            selectedTest: null,
            currentQuestionIndex: 0,
            answerSelected: false,
            selectedAnswerIndex: null,
            userAnswers: [],
            expandedQuestionIndex: null
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
        },
        errorCount() {
            return this.userAnswers.filter(a => !a.correct).length;
        },
        passed() {
            return this.errorCount <= 2;
        }
    },
    methods: {
        // --- Navigation ---
        navigateTo(section) {
            if (!this.authToken) {
                this.pendingSection = section;
                this.authPassword = '';
                this.authError = '';
                this.currentView = 'auth';
            } else {
                this.goToSection(section);
            }
        },
        navigateToLesson(id) {
            if (!this.authToken) {
                this.pendingLessonId = id;
                this.pendingSection = 'lessons';
                this.authPassword = '';
                this.authError = '';
                this.currentView = 'auth';
            } else {
                this.openLesson(id);
            }
        },
        goToSection(section) {
            if (section === 'lessons') {
                if (this.pendingLessonId) {
                    const id = this.pendingLessonId;
                    this.pendingLessonId = null;
                    this.openLesson(id);
                } else {
                    this.loadLessons();
                    this.currentView = 'lessons';
                }
            } else {
                this.currentView = 'testSelection';
            }
        },
        backToHome() {
            this.currentView = 'home';
            history.replaceState(null, '', window.location.pathname);
        },
        handleHashNavigation() {
            const hash = window.location.hash;
            if (!hash.startsWith('#lesson/')) return;
            const id = hash.slice(8);
            if (id && this.currentLesson?.id !== id) {
                this.navigateToLesson(id);
            }
        },

        // --- Auth ---
        async submitAuth() {
            if (!this.authPassword || !this.authCallsignInput.trim()) return;
            this.authError = '';
            try {
                const res = await fetch('/api/auth', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: this.authPassword })
                });
                const data = await res.json();
                if (!res.ok) {
                    this.authError = data.error || 'Помилка авторизації';
                    return;
                }
                this.authToken = data.token;
                this.authCallsign = this.authCallsignInput.trim();
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('authCallsign', this.authCallsign);
                this.authPassword = '';
                this.authCallsignInput = '';
                this.goToSection(this.pendingSection);
            } catch {
                this.authError = 'Помилка підключення до сервера';
            }
        },
        handleUnauth() {
            this.authToken = null;
            localStorage.removeItem('authToken');
            this.pendingSection = (this.currentView === 'lessons' || this.currentView === 'lesson') ? 'lessons' : 'tests';
            this.authPassword = '';
            this.authCallsignInput = '';
            this.authError = '';
            this.currentView = 'auth';
        },

        // --- Lessons ---
        async loadLessons() {
            try {
                const res = await fetch('/api/lessons', {
                    headers: { 'Authorization': 'Bearer ' + this.authToken }
                });
                if (res.status === 401) { this.handleUnauth(); return; }
                this.lessonsList = await res.json(); // [{id, name, order, lessons: [...]}]
            } catch {
                console.error('Помилка завантаження уроків');
            }
        },
        async openLesson(id) {
            try {
                const res = await fetch(`/api/lessons/${id}`, {
                    headers: { 'Authorization': 'Bearer ' + this.authToken }
                });
                if (res.status === 401) { this.handleUnauth(); return; }
                this.currentLesson = await res.json();
                this.currentView = 'lesson';
                history.replaceState(null, '', `#lesson/${id}`);
                if (this.lessonsList.length === 0) this.loadLessons();
            } catch {
                console.error('Помилка завантаження уроку');
            }
        },
        backToLessons() {
            this.currentLesson = null;
            this.currentView = 'lessons';
            history.replaceState(null, '', window.location.pathname);
        },

        // --- Tests ---
        shuffleAnswers(question) {
            const correctAnswer = question.answers[question.correctAnswer];
            const shuffled = [...question.answers];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            question.answers = shuffled;
            question.correctAnswer = shuffled.indexOf(correctAnswer);
        },
        async loadTests() {
            try {
                const response = await fetch('tests.json');
                const data = await response.json();
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
            this.selectedTest = JSON.parse(JSON.stringify(test));
            this.selectedTest.questions.forEach(question => {
                this.shuffleAnswers(question);
            });
            this.currentQuestionIndex = 0;
            this.answerSelected = false;
            this.selectedAnswerIndex = null;
            this.userAnswers = [];
            this.expandedQuestionIndex = null;
            this.currentView = 'testing';
        },
        selectAnswer(index) {
            if (this.answerSelected) return;
            this.answerSelected = true;
            this.selectedAnswerIndex = index;
            this.userAnswers.push({
                questionIndex: this.currentQuestionIndex,
                selectedIndex: index,
                correct: index === this.currentQuestion.correctAnswer
            });
        },
        getAnswerClass(index) {
            if (!this.answerSelected) {
                return 'bg-gray-100 hover:bg-indigo-100 text-gray-800 border-2 border-gray-300';
            }
            if (index === this.currentQuestion.correctAnswer) {
                return 'bg-green-500 text-white border-2 border-green-600';
            }
            if (index === this.selectedAnswerIndex) {
                return 'bg-red-500 text-white border-2 border-red-600';
            }
            return 'bg-gray-100 text-gray-800 border-2 border-gray-300';
        },
        nextQuestion() {
            if (this.isLastQuestion) {
                this.saveTestResult();
                this.currentView = 'results';
                this.expandedQuestionIndex = null;
            } else {
                this.currentQuestionIndex++;
                this.answerSelected = false;
                this.selectedAnswerIndex = null;
            }
        },
        saveTestResult() {
            const correct = this.userAnswers.filter(a => a.correct).length;
            const incorrect = this.userAnswers.filter(a => !a.correct).length;
            const wrongQuestions = this.userAnswers
                .filter(a => !a.correct)
                .map(a => a.questionIndex + 1);
            fetch('/api/save-result', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: this.authCallsign,
                    testName: this.selectedTest.name,
                    correct,
                    incorrect,
                    wrongQuestions,
                    passed: incorrect <= 2
                })
            }).catch(console.error);
        },
        toggleQuestion(index) {
            this.expandedQuestionIndex = this.expandedQuestionIndex === index ? null : index;
        },
        isQuestionCorrect(index) {
            const answer = this.userAnswers.find(a => a.questionIndex === index);
            return answer ? answer.correct : false;
        },
        getAnswerForQuestion(index) {
            return this.userAnswers.find(a => a.questionIndex === index);
        },
        proceedToSuccess() {
            this.currentView = 'success';
        },
        retryTest() {
            const originalTest = this.tests.find(t => t.name === this.selectedTest.name);
            this.selectTest(originalTest);
        },
        submitName() {
            if (this.userName.trim()) {
                fetch('/api/save-result', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
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
            this.answerSelected = false;
            this.selectedAnswerIndex = null;
            this.userAnswers = [];
            this.expandedQuestionIndex = null;
        }
    },
    mounted() {
        this.loadTests();
        this.handleHashNavigation();
        window.addEventListener('hashchange', this.handleHashNavigation);
    }
}).mount('#app');
