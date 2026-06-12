const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 80;
const DATA_DIR = path.join(__dirname, 'data');
const RESULTS_FILE = path.join(DATA_DIR, 'results.txt');
const LESSONS_DIR = path.join(DATA_DIR, 'lessons');

const PASSWORD_HASH = crypto.createHash('sha256').update('asgard@2023').digest('hex');
const sessions = new Map();

(async () => {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        await fs.mkdir(LESSONS_DIR, { recursive: true });
    } catch (err) {
        console.error('Помилка створення директорій:', err);
    }
})();

app.use(express.json());
app.use(express.static(__dirname));

function requireAuth(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Не авторизовано' });
    }
    const token = auth.slice(7);
    if (!sessions.has(token)) {
        return res.status(401).json({ error: 'Сесія недійсна' });
    }
    next();
}

app.post('/api/auth', (req, res) => {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Введіть пароль' });
    const hash = crypto.createHash('sha256').update(password).digest('hex');
    if (hash !== PASSWORD_HASH) return res.status(401).json({ error: 'Невірний пароль' });
    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, Date.now());
    res.json({ token });
});

app.get('/api/lessons', requireAuth, async (_req, res) => {
    try {
        let categories = [];
        try {
            categories = JSON.parse(await fs.readFile(path.join(LESSONS_DIR, 'categories.json'), 'utf8'));
        } catch { /* no categories file */ }

        const files = (await fs.readdir(LESSONS_DIR))
            .filter(f => f.endsWith('.json') && f !== 'categories.json');

        const lessons = await Promise.all(files.map(async file => {
            const content = JSON.parse(await fs.readFile(path.join(LESSONS_DIR, file), 'utf8'));
            return { id: path.basename(file, '.json'), title: content.title, category: content.category || null, order: content.order ?? 0 };
        }));

        const grouped = categories.map(cat => ({
            ...cat,
            lessons: lessons.filter(l => l.category === cat.id).sort((a, b) => a.order - b.order)
        }));

        const uncategorized = lessons.filter(l => !categories.find(c => c.id === l.category));
        if (uncategorized.length > 0) {
            grouped.push({ id: 'uncategorized', name: 'Інше', order: 9999, lessons: uncategorized.sort((a, b) => a.order - b.order) });
        }

        res.json(grouped.sort((a, b) => a.order - b.order));
    } catch {
        res.status(500).json({ error: 'Помилка завантаження' });
    }
});

app.get('/api/lessons/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    if (!/^[\w-]+$/.test(id)) return res.status(400).json({ error: 'Невірний запит' });
    try {
        const lessonPath = path.join(LESSONS_DIR, `${id}.json`);
        const content = JSON.parse(await fs.readFile(lessonPath, 'utf8'));
        res.json({ id, ...content });
    } catch (err) {
        if (err.code === 'ENOENT') return res.status(404).json({ error: 'Не знайдено' });
        res.status(500).json({ error: 'Помилка завантаження' });
    }
});

app.post('/api/save-result', async (req, res) => {
    try {
        const { name, testName, correct, incorrect, wrongQuestions, passed } = req.body;

        if (!name || !testName) {
            return res.status(400).json({ error: 'Невірні дані' });
        }

        const now = new Date();
        const date = now.toLocaleDateString('uk-UA');
        const time = now.toLocaleTimeString('uk-UA');

        const status = passed ? 'СКЛАВ' : 'НЕ СКЛАВ';
        const wrongStr = wrongQuestions && wrongQuestions.length > 0
            ? `помилки у пит. ${wrongQuestions.join(', ')}`
            : 'без помилок';
        const result = `${date} ${time} | ${name} | ${testName} | ${status} | ✓${correct} ✗${incorrect} | ${wrongStr}\n`;

        await fs.appendFile(RESULTS_FILE, result, 'utf8');

        res.json({ success: true });
    } catch (error) {
        console.error('Помилка збереження:', error);
        res.status(500).json({ error: 'Помилка збереження' });
    }
});

app.get('/_results_', async (_req, res) => {
    try {
        let content = '';
        try {
            content = await fs.readFile(RESULTS_FILE, 'utf8');
        } catch (err) {
            if (err.code === 'ENOENT') {
                content = 'Результатів поки немає';
            } else {
                throw err;
            }
        }

        const lines = content.split('\n').filter(line => line.trim());
        const reversedLines = lines.reverse();

        res.send(`
<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow">
    <title>Результати</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 min-h-screen p-8">
    <div class="max-w-4xl mx-auto">
        <div class="bg-white rounded-lg shadow-lg p-6">
            <h1 class="text-3xl font-bold text-indigo-800 mb-6">Результати тестування</h1>
            <div class="space-y-2">
                ${reversedLines.length > 0
                    ? reversedLines.map(line => `
                        <div class="p-3 bg-gray-50 rounded border-l-4 border-indigo-500">
                            <code class="text-gray-700">${line}</code>
                        </div>
                    `).join('')
                    : '<p class="text-gray-500">Результатів поки немає</p>'
                }
            </div>
            <div class="mt-6 text-sm text-gray-500">
                Всього записів: ${reversedLines.length}
            </div>
        </div>
    </div>
</body>
</html>
        `);
    } catch (error) {
        console.error('Помилка читання:', error);
        res.status(500).send('Помилка завантаження результатів');
    }
});

app.get('/video/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        const videoPath = path.join(DATA_DIR, filename);

        try {
            await fs.access(videoPath);
        } catch {
            return res.status(404).send('Відео не знайдено');
        }

        res.send(`
<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${filename}</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-900 min-h-screen flex items-center justify-center p-4">
    <div class="max-w-5xl w-full">
        <div class="bg-gray-800 rounded-lg shadow-2xl p-6">
            <h1 class="text-2xl font-bold text-white mb-4">${filename}</h1>
            <video
                controls
                autoplay
                class="w-full rounded-lg shadow-lg"
                src="/data/${filename}"
            >
                Ваш браузер не підтримує відео.
            </video>
        </div>
    </div>
</body>
</html>
        `);
    } catch (error) {
        console.error('Помилка:', error);
        res.status(500).send('Помилка завантаження відео');
    }
});

app.use('/data', express.static(DATA_DIR));

app.get('/robots.txt', (req, res) => {
    res.type('text/plain');
    res.send('User-agent: *\nDisallow: /');
});

app.listen(PORT, () => {
    console.log(`Сервер запущено на порті ${PORT}`);
});
