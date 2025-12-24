// ================= КОНФИГУРАЦИЯ =================
// Настройка под шаблон sert.pdf
const CONFIG = {
    // Путь к шаблону (относительно index.html)
    templateUrl: 'assets/sert.pdf',
    
    // Координаты текста (x, y) в пикселях от левого верхнего угла
    // Координаты рамок: x, y, width, height
    textPositions: {
        // сумма подарка: x: 504, y: 233, width: 261, height: 73
        amount: { x: 514, y: 225, w: 261, h: 73 }, // Сдвинуто немного выше и правее
        // Поздравления: x: 52, y: 441, width: 472, height: 155
        congrats: { x: 52, y: 441, w: 472, h: 155 },
        // код сертификата: x: 52, y: 671, width: 397, height: 71
        code: { x: 52, y: 671, w: 397, h: 71 }
    },
    
    // Настройки шрифтов
    fontSize: {
        amount: 32,   // Размер для суммы подарка
        code: 24,     // Размер для кода
        congrats: 22  // Размер для поздравления (увеличено для лучшей читаемости)
    },
    
    // Цвет текста
    fontColor: { r: 0, g: 0, b: 0 }, // Черный для кода и поздравления
    amountColor: { r: 1, g: 1, b: 1 }, // БЕЛЫЙ для суммы подарка
    
    // Максимальная ширина текста поздравления (в пикселях)
    congratsMaxWidth: 472,
    
    // Смещение для суммы подарка (немного выше и правее)
    amountOffset: { x: 10, y: -8 }
};

// ================= КОНЕЦ КОНФИГУРАЦИИ =================

// Получаем элементы DOM
const nameInput = document.getElementById('name');
const amountInput = document.getElementById('amount');
const codeInput = document.getElementById('code');
const congratsInput = document.getElementById('congrats');
const previewBtn = document.getElementById('previewBtn');
const downloadImageBtn = document.getElementById('downloadImageBtn');
const previewCanvas = document.getElementById('previewCanvas');
const statusDiv = document.getElementById('status');
const highQualityCanvas = document.getElementById('highQualityCanvas');

// Состояние загрузки шаблона
let templatePdfBytes = null;
let isTemplateLoaded = false;
let pageHeight = 0;
let pageWidth = 0;

// Создаем скрытый canvas для высококачественного изображения
const offscreenCanvas = document.createElement('canvas');
const offscreenCtx = offscreenCanvas.getContext('2d');

// Функция загрузки PDF шаблона
async function loadTemplatePDF() {
    try {
        // Проверяем, что PDFLib доступен
        if (typeof pdfjsLib === 'undefined') {
            throw new Error('pdf.js не загружен. Проверьте подключение скрипта.');
        }
        
        const response = await fetch(CONFIG.templateUrl);
        if (!response.ok) {
            throw new Error(`Не удалось загрузить файл: ${response.status} ${response.statusText}. Убедитесь, что файл ${CONFIG.templateUrl} существует.`);
        }
        const arrayBuffer = await response.arrayBuffer();
        templatePdfBytes = arrayBuffer;
        
        // Загружаем PDF чтобы получить размеры страницы
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        
        // Получаем размеры страницы
        const viewport = page.getViewport({ scale: 1.0 });
        pageHeight = viewport.height;
        pageWidth = viewport.width;
        
        console.log(`✅ Размеры страницы: ${pageWidth} x ${pageHeight}`);
        
        isTemplateLoaded = true;
        console.log('✅ Шаблон сертификата загружен успешно');
        return true;
    } catch (error) {
        console.error('Ошибка загрузки шаблона:', error);
        let errorMessage = `Ошибка загрузки шаблона: ${error.message}`;
        
        // Проверяем, не открыт ли файл через file://
        if (window.location.protocol === 'file:') {
            errorMessage += '. Файл открыт через file://. Запустите через HTTP сервер: python3 -m http.server 8000, затем откройте http://localhost:8000';
        }
        
        isTemplateLoaded = false;
        templatePdfBytes = null;
        
        if (statusDiv) {
            showStatus(errorMessage, 'error');
        }
        return false;
    }
}

// Функция показа статуса
function showStatus(message, type = 'success') {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    
    // Автоматически скрываем через 5 секунд
    setTimeout(() => {
        statusDiv.className = 'status';
    }, 5000);
}

// Функция генерации текста поздравления
function generateCongratsText(name) {
    const baseText = congratsInput.value.trim();
    if (!name.trim()) return baseText;
    
    // Добавляем имя в начало поздравления
    return `${name}, ${baseText}`;
}

// Функция рендеринга сертификата на canvas
async function renderCertificateToCanvas(canvas, scale = 1) {
    if (!isTemplateLoaded || !templatePdfBytes) {
        throw new Error('Шаблон не загружен');
    }
    
    if (!nameInput.value.trim() || !codeInput.value.trim()) {
        throw new Error('Заполните имя и код');
    }
    
    try {
        // Используем pdf.js для рендеринга PDF на canvas
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
        
        const loadingTask = pdfjsLib.getDocument({ data: templatePdfBytes });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        
        // Получаем размеры страницы
        const viewportForScale = page.getViewport({ scale: 1.0 });
        const actualPageWidth = pageWidth || viewportForScale.width;
        const actualPageHeight = pageHeight || viewportForScale.height;
        
        // Масштаб для отображения
        const viewport = page.getViewport({ scale: scale });
        
        // Настраиваем canvas
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        
        // Заполняем белым фоном (на случай прозрачности в PDF)
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Рендерим PDF страницу
        await page.render({
            canvasContext: ctx,
            viewport: viewport
        }).promise;
        
        // Добавляем текст поверх
        const textScale = scale;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        // Сумма подарка - БЕЛЫМ цветом, немного выше и правее
        if (amountInput && amountInput.value.trim()) {
            const amountX = (CONFIG.textPositions.amount.x + CONFIG.amountOffset.x) * textScale;
            const amountY = (CONFIG.textPositions.amount.y + CONFIG.amountOffset.y) * textScale;
            const amountCenterY = amountY + CONFIG.textPositions.amount.h * textScale / 2;
            const amountBaselineY = amountCenterY - CONFIG.fontSize.amount * 0.75 * textScale;
            
            ctx.font = `bold ${CONFIG.fontSize.amount * textScale}px Arial`;
            ctx.fillStyle = `rgb(${Math.round(CONFIG.amountColor.r * 255)}, ${Math.round(CONFIG.amountColor.g * 255)}, ${Math.round(CONFIG.amountColor.b * 255)})`;
            ctx.fillText(amountInput.value.trim(), amountX, amountBaselineY);
        }
        
        // Поздравление - ЧЕРНЫМ, с именем в начале
        const congratsText = generateCongratsText(nameInput.value);
        ctx.font = `${CONFIG.fontSize.congrats * textScale}px Arial`;
        ctx.fillStyle = `rgb(${Math.round(CONFIG.fontColor.r * 255)}, ${Math.round(CONFIG.fontColor.g * 255)}, ${Math.round(CONFIG.fontColor.b * 255)})`;
        
        const congratsLines = splitTextIntoLines(
            congratsText, 
            CONFIG.textPositions.congrats.w * textScale, 
            ctx
        );
        
        const lineHeight = (CONFIG.fontSize.congrats + 8) * textScale;
        const totalTextHeight = (congratsLines.length - 1) * lineHeight;
        const congratsYOffset = (CONFIG.textPositions.congrats.h * textScale - totalTextHeight) / 2;
        const firstLineBaselineY = CONFIG.textPositions.congrats.y * textScale + congratsYOffset + CONFIG.fontSize.congrats * 0.75 * textScale;
        
        congratsLines.forEach((line, index) => {
            if (line.trim()) {
                ctx.fillText(
                    line, 
                    CONFIG.textPositions.congrats.x * textScale, 
                    firstLineBaselineY + (index * lineHeight)
                );
            }
        });
        
        // Код сертификата - ЧЕРНЫМ
        const codeCenterY = CONFIG.textPositions.code.y + CONFIG.textPositions.code.h / 2;
        const codeBaselineY = codeCenterY - CONFIG.fontSize.code * 0.75;
        
        ctx.font = `bold ${CONFIG.fontSize.code * textScale}px Arial`;
        ctx.fillStyle = `rgb(${Math.round(CONFIG.fontColor.r * 255)}, ${Math.round(CONFIG.fontColor.g * 255)}, ${Math.round(CONFIG.fontColor.b * 255)})`;
        ctx.fillText(codeInput.value, CONFIG.textPositions.code.x * textScale, codeBaselineY * textScale);
        
        return true;
    } catch (error) {
        console.error('Ошибка рендеринга:', error);
        throw error;
    }
}

// Функция предпросмотра
async function showPreview() {
    if (!isTemplateLoaded || !templatePdfBytes) {
        showStatus('Шаблон не загружен. Пожалуйста, обновите страницу.', 'error');
        return;
    }
    
    if (!nameInput.value.trim() || !codeInput.value.trim()) {
        showStatus('Заполните имя и код для предпросмотра', 'error');
        return;
    }
    
    try {
        // Получаем размеры страницы для расчета масштаба предпросмотра
        const previewScale = Math.min(400 / pageWidth, 600 / pageHeight);
        
        await renderCertificateToCanvas(previewCanvas, previewScale);
        showStatus('Предпросмотр обновлен', 'success');
    } catch (error) {
        console.error('Ошибка предпросмотра:', error);
        showStatus(`Ошибка предпросмотра: ${error.message}`, 'error');
    }
}

// Функция скачивания изображения в высоком качестве
async function downloadHighQualityImage() {
    if (!isTemplateLoaded || !templatePdfBytes) {
        showStatus('Шаблон не загружен. Пожалуйста, обновите страницу.', 'error');
        return;
    }
    
    if (!nameInput.value.trim() || !codeInput.value.trim()) {
        showStatus('Заполните имя и код для генерации сертификата', 'error');
        return;
    }
    
    showStatus('⏳ Создаю изображение в высоком качестве...', 'success');
    
    try {
        // Рендерим в высоком качестве (масштаб 2x для четкости)
        const highQualityScale = 2;
        
        // Используем скрытый canvas для высококачественного рендеринга
        offscreenCanvas.width = pageWidth * highQualityScale;
        offscreenCanvas.height = pageHeight * highQualityScale;
        
        await renderCertificateToCanvas(offscreenCanvas, highQualityScale);
        
        // Создаем ссылку для скачивания
        offscreenCanvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            
            // Создаем временную ссылку для скачивания
            const link = document.createElement('a');
            link.href = url;
            link.download = `Новогодний_сертификат_${nameInput.value.replace(/\s+/g, '_')}.png`;
            
            // Стилизуем скрыто
            link.style.position = 'fixed';
            link.style.top = '-100px';
            link.style.left = '-100px';
            link.style.opacity = '0';
            
            document.body.appendChild(link);
            
            // Имитируем клик для скачивания
            link.click();
            
            // Очистка
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 100);
            
            showStatus(`✅ Сертификат для "${nameInput.value}" создан! Изображение скачивается...`, 'success');
        }, 'image/png', 1.0); // Качество 1.0 (максимальное)
        
    } catch (error) {
        console.error('Ошибка создания изображения:', error);
        showStatus(`❌ Ошибка: ${error.message}`, 'error');
    }
}

// Функция показа изображения в высоком качестве для сохранения
async function showHighQualityImage() {
    if (!isTemplateLoaded || !templatePdfBytes) {
        return;
    }
    
    try {
        // Рендерим в высоком качестве (оригинальный размер)
        await renderCertificateToCanvas(highQualityCanvas, 1);
        
        // Показываем canvas
        highQualityCanvas.style.display = 'block';
        
        // Добавляем инструкцию
        const instruction = document.createElement('p');
        instruction.className = 'download-instruction';
        instruction.innerHTML = 'Для сохранения сертификата:<br>1. Нажмите на изображение правой кнопкой мыши<br>2. Выберите "Сохранить изображение как..."<br>3. Выберите место для сохранения';
        
        // Вставляем инструкцию после canvas
        highQualityCanvas.parentNode.insertBefore(instruction, highQualityCanvas.nextSibling);
        
    } catch (error) {
        console.error('Ошибка создания изображения:', error);
    }
}

// Вспомогательная функция для разбивки текста на строки
function splitTextIntoLines(text, maxWidth, context) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0] || '';
    
    for (let i = 1; i < words.length; i++) {
        const testLine = currentLine + ' ' + words[i];
        const metrics = context.measureText(testLine);
        
        if (metrics.width <= maxWidth) {
            currentLine = testLine;
        } else {
            lines.push(currentLine);
            currentLine = words[i];
        }
    }
    
    if (currentLine) {
        lines.push(currentLine);
    }
    
    return lines;
}

// Назначаем обработчики событий
previewBtn.addEventListener('click', showPreview);
downloadImageBtn.addEventListener('click', downloadHighQualityImage);

// Автоматическое обновление предпросмотра при изменении текста
const inputs = [nameInput, amountInput, codeInput, congratsInput];
inputs.forEach(input => {
    if (input) {
        input.addEventListener('input', () => {
            // Используем debounce для избежания частых обновлений
            clearTimeout(window.previewTimeout);
            window.previewTimeout = setTimeout(() => {
                if (nameInput.value.trim() && codeInput.value.trim()) {
                    showPreview();
                }
            }, 500);
        });
    }
});

// Инициализация при загрузке DOM
window.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Генератор новогодних сертификатов загружен!');
    
    // Проверяем доступность библиотеки pdf.js
    if (typeof pdfjsLib === 'undefined') {
        console.error('❌ pdf.js не загружена!');
        if (statusDiv) showStatus('Ошибка: библиотека pdf.js не загружена. Проверьте подключение.', 'error');
        return;
    } else {
        console.log('✅ pdf.js загружена');
    }
    
    // Настраиваем pdf.js
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
    
    // Загружаем шаблон
    console.log('📄 Начинаю загрузку шаблона PDF...');
    const loaded = await loadTemplatePDF();
    if (!loaded) {
        console.error('❌ Не удалось загрузить шаблон');
    } else {
        console.log('✅ Шаблон загружен, можно работать');
        
        // Показываем начальный предпросмотр, если данные уже введены
        if (nameInput.value.trim() && codeInput.value.trim()) {
            showPreview();
        }
    }
    
    // Добавляем обработчик клика на высококачественное изображение для сохранения
    highQualityCanvas.addEventListener('click', () => {
        showHighQualityImage();
    });
});

// Устанавливаем плейсхолдер для поздравления
if (congratsInput) {
    congratsInput.placeholder = "поздравляю тебя с Новым Годом! Пусть этот год принесет тебе много радости, счастья и успехов во всех начинаниях!";
}
