const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 80;
const DATA_DIR = path.join(__dirname, 'data');
const RESULTS_FILE = path.join(DATA_DIR, 'results.txt');

// Створюємо директорію для даних при старті
(async () => {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
    } catch (err) {
        console.error('Помилка створення директорії:', err);
    }
})();

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// Збереження результату
app.post('/api/save-result', async (req, res) => {
    try {
        const { name, testName } = req.body;
        
        if (!name || !testName) {
            return res.status(400).json({ error: 'Невірні дані' });
        }

        const now = new Date();
        const date = now.toLocaleDateString('uk-UA');
        const time = now.toLocaleTimeString('uk-UA');
        
        const result = `${date} ${time} - ${name} - ${testName}\n`;
        
        await fs.appendFile(RESULTS_FILE, result, 'utf8');
        
        res.json({ success: true });
    } catch (error) {
        console.error('Помилка збереження:', error);
        res.status(500).json({ error: 'Помилка збереження' });
    }
});

// Перегляд результатів
app.get('/_results_', async (req, res) => {
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

// Відображення відео
app.get('/video/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        const videoPath = path.join(DATA_DIR, filename);
        
        // Перевірка існування файлу
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

// Статичні файли з папки data
app.use('/data', express.static(DATA_DIR));

// robots.txt
app.get('/robots.txt', (req, res) => {
    res.type('text/plain');
    res.send('User-agent: *\nDisallow: /');
});

app.listen(PORT, () => {
    console.log(`Сервер запущено на порті ${PORT}`);
});
