// ================= КОНФИГУРАЦИЯ =================
// Настройка под шаблон sert.pdf
const CONFIG = {
    // Путь к шаблону (относительно index.html)
    templateUrl: 'assets/sert.pdf',
    
    // Координаты текста (x, y) в пикселях от левого верхнего угла
    // Координаты рамок: x, y, width, height
    textPositions: {
        // сумма подарка: x: 504, y: 233, width: 261, height: 73
        amount: { x: 504, y: 233, w: 261, h: 73 },
        // Имя: x: 52, y: 347, width: 337, height: 64
        name: { x: 52, y: 347, w: 337, h: 64 },
        // Поздравления: x: 52, y: 441, width: 472, height: 155
        congrats: { x: 52, y: 441, w: 472, h: 155 },
        // код сертификата: x: 52, y: 671, width: 397, height: 71
        code: { x: 52, y: 671, w: 397, h: 71 }
    },
    
    // Настройки шрифтов
    fontSize: {
        amount: 32,   // Размер для суммы подарка
        name: 36,     // Размер для имени
        code: 24,     // Размер для кода
        congrats: 18  // Размер для поздравления
    },
    
    // Цвет текста в формате RGB (от 0 до 1)
    fontColor: { r: 0.1725, g: 0.2431, b: 0.3137 }, // #2c3e50
    
    // Максимальная ширина текста поздравления (в пикселях)
    congratsMaxWidth: 472
};
// ================= КОНЕЦ КОНФИГУРАЦИИ =================

// Получаем элементы DOM
const nameInput = document.getElementById('name');
const amountInput = document.getElementById('amount');
const codeInput = document.getElementById('code');
const congratsInput = document.getElementById('congrats');
const previewBtn = document.getElementById('previewBtn');
const generateBtn = document.getElementById('generateBtn');
const previewCanvas = document.getElementById('previewCanvas');
const statusDiv = document.getElementById('status');

// Состояние загрузки шаблона
let templatePdfBytes = null;
let isTemplateLoaded = false;
let pageHeight = 0;
let pageWidth = 0;

// Функция загрузки PDF шаблона
async function loadTemplatePDF() {
    try {
        // Проверяем, что PDFLib доступен
        if (typeof PDFLib === 'undefined') {
            throw new Error('PDFLib не загружен. Проверьте подключение скрипта.');
        }
        
        const response = await fetch(CONFIG.templateUrl);
        if (!response.ok) {
            throw new Error(`Не удалось загрузить файл: ${response.status} ${response.statusText}. Убедитесь, что файл ${CONFIG.templateUrl} существует.`);
        }
        const arrayBuffer = await response.arrayBuffer();
        templatePdfBytes = arrayBuffer;
        
        // Загружаем PDF чтобы получить размеры страницы
        const { PDFDocument } = PDFLib;
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const pages = pdfDoc.getPages();
        if (pages.length > 0) {
            const firstPage = pages[0];
            pageHeight = firstPage.getHeight();
            pageWidth = firstPage.getWidth();
            console.log(`✅ Размеры страницы: ${pageWidth} x ${pageHeight}`);
        }
        
        isTemplateLoaded = true;
        console.log('✅ Шаблон сертификата загружен успешно');
        if (statusDiv) {
            // Не показываем сообщение об успехе автоматически, только при ошибке
            // showStatus('Шаблон загружен успешно', 'success');
        }
        return true;
    } catch (error) {
        console.error('Ошибка загрузки шаблона:', error);
        let errorMessage = `Ошибка загрузки шаблона: ${error.message}`;
        
        // Проверяем, не открыт ли файл через file://
        if (window.location.protocol === 'file:') {
            errorMessage += '. Файл открыт через file://. Запустите через HTTP сервер: python3 -m http.server 8000, затем откройте http://localhost:8000';
        }
        
        // Устанавливаем флаг в false явно
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

// Функция предпросмотра
async function showPreview() {
    if (!isTemplateLoaded || !templatePdfBytes) {
        if (!templatePdfBytes) {
            showStatus('Ошибка: шаблон не загружен. Проверьте консоль браузера (F12) или обновите страницу.', 'error');
            console.error('Шаблон не загружен. Попробуйте перезагрузить страницу.');
        } else {
            showStatus('Шаблон еще загружается. Подождите немного.', 'error');
        }
        return;
    }
    
    if (!nameInput.value.trim() || !codeInput.value.trim()) {
        showStatus('Заполните имя и код для предпросмотра', 'error');
        return;
    }
    
    try {
        // Используем pdf.js для рендеринга PDF на canvas
        // Проверяем доступность pdf.js
        let pdfjs = null;
        if (typeof pdfjsLib !== 'undefined') {
            pdfjs = pdfjsLib;
        } else if (typeof window !== 'undefined' && window.pdfjsLib) {
            pdfjs = window.pdfjsLib;
        }
        
        if (!pdfjs || !pdfjs.getDocument) {
            showStatus('Предпросмотр временно недоступен. Используйте кнопку генерации PDF.', 'error');
            console.warn('pdf.js не найдена, предпросмотр отключен');
            return;
        }
        
        pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
        
        const loadingTask = pdfjs.getDocument({ data: templatePdfBytes });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        
        // Получаем размеры страницы из PDF
        const viewportForScale = page.getViewport({ scale: 1.0 });
        const actualPageWidth = pageWidth || viewportForScale.width;
        const actualPageHeight = pageHeight || viewportForScale.height;
        
        // Масштаб для отображения
        const scale = Math.min(400 / actualPageWidth, 600 / actualPageHeight);
        const viewport = page.getViewport({ scale: scale });
        
        // Настраиваем canvas
        const ctx = previewCanvas.getContext('2d');
        previewCanvas.height = viewport.height;
        previewCanvas.width = viewport.width;
        
        // Рендерим PDF страницу
        await page.render({
            canvasContext: ctx,
            viewport: viewport
        }).promise;
        
        // Добавляем текст поверх
        const textScale = scale;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = `rgb(${Math.round(CONFIG.fontColor.r * 255)}, ${Math.round(CONFIG.fontColor.g * 255)}, ${Math.round(CONFIG.fontColor.b * 255)})`;
        
        // Рисуем сумму подарка (если указана)
        if (amountInput && amountInput.value.trim()) {
            const amountCenterY = CONFIG.textPositions.amount.y + CONFIG.textPositions.amount.h / 2;
            const amountBaselineY = amountCenterY - CONFIG.fontSize.amount * 0.75;
            ctx.font = `bold ${CONFIG.fontSize.amount * textScale}px Arial`;
            ctx.fillText(amountInput.value.trim(), CONFIG.textPositions.amount.x * textScale, amountBaselineY * textScale);
        }
        
        // Рисуем имя
        const nameCenterY = CONFIG.textPositions.name.y + CONFIG.textPositions.name.h / 2;
        const nameBaselineY = nameCenterY - CONFIG.fontSize.name * 0.75;
        ctx.font = `bold ${CONFIG.fontSize.name * textScale}px Arial`;
        ctx.fillText(nameInput.value, CONFIG.textPositions.name.x * textScale, nameBaselineY * textScale);
        
        // Рисуем код
        const codeCenterY = CONFIG.textPositions.code.y + CONFIG.textPositions.code.h / 2;
        const codeBaselineY = codeCenterY - CONFIG.fontSize.code * 0.75;
        ctx.font = `bold ${CONFIG.fontSize.code * textScale}px Arial`;
        ctx.fillText(codeInput.value, CONFIG.textPositions.code.x * textScale, codeBaselineY * textScale);
        
        // Рисуем поздравление
        ctx.font = `${CONFIG.fontSize.congrats * textScale}px Arial`;
        const congratsLines = splitTextIntoLines(
            congratsInput.value, 
            CONFIG.congratsMaxWidth * textScale, 
            ctx
        );
        const lineHeight = (CONFIG.fontSize.congrats + 5) * textScale;
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
        
        showStatus('Предпросмотр обновлен. Проверьте расположение текста.', 'success');
        
    } catch (error) {
        console.error('Ошибка предпросмотра:', error);
        showStatus(`Ошибка предпросмотра: ${error.message}. Генерация PDF все равно работает.`, 'error');
    }
}

// Функция генерации PDF
async function generatePDF() {
    if (!isTemplateLoaded || !templatePdfBytes) {
        // Проверяем, была ли попытка загрузки
        if (!templatePdfBytes) {
            showStatus('Ошибка: шаблон не загружен. Проверьте консоль браузера (F12) или обновите страницу.', 'error');
            console.error('Шаблон не загружен. Попробуйте перезагрузить страницу.');
        } else {
            showStatus('Шаблон еще загружается. Подождите немного.', 'error');
        }
        return;
    }
    
    if (!nameInput.value.trim() || !codeInput.value.trim()) {
        showStatus('Заполните имя и код для генерации сертификата', 'error');
        return;
    }
    
    showStatus('⏳ Создаю PDF-сертификат...', 'success');
    
    try {
        // Проверяем наличие PDFLib
        if (typeof PDFLib === 'undefined') {
            throw new Error('Библиотека PDFLib не загружена. Обновите страницу.');
        }
        
        // 1. Загружаем существующий PDF шаблон
        const { PDFDocument, StandardFonts } = PDFLib;
        const pdfDoc = await PDFDocument.load(templatePdfBytes);
        
        // 2. Получаем первую страницу
        const pages = pdfDoc.getPages();
        if (pages.length === 0) {
            throw new Error('Шаблон PDF не содержит страниц');
        }
        const page = pages[0];
        const pageHeight = page.getHeight();
        
        // 3. Загружаем шрифты с поддержкой кириллицы
        const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
        const boldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
        
        // 4. Добавляем текст в PDF
        // В PDF координата Y идет снизу вверх, поэтому нужно конвертировать
        // page.drawText использует Y как baseline (примерно 0.75 * fontSize от верха текста)
        
        // Сумма подарка (если указана)
        if (amountInput && amountInput.value.trim()) {
            const amountCenterFromTop = CONFIG.textPositions.amount.y + CONFIG.textPositions.amount.h / 2;
            const amountBaselineFromTop = amountCenterFromTop - CONFIG.fontSize.amount * 0.75;
            const amountY = pageHeight - amountBaselineFromTop;
            page.drawText(amountInput.value.trim(), {
                x: CONFIG.textPositions.amount.x,
                y: amountY,
                size: CONFIG.fontSize.amount,
                font: boldFont,
                color: PDFLib.rgb(CONFIG.fontColor.r, CONFIG.fontColor.g, CONFIG.fontColor.b),
            });
        }
        
        // Имя (жирным) - позиционируем в центре блока по вертикали
        // Центр блока от верха: blockY + blockH/2
        // Baseline от центра: -fontSize * 0.75
        const nameCenterFromTop = CONFIG.textPositions.name.y + CONFIG.textPositions.name.h / 2;
        const nameBaselineFromTop = nameCenterFromTop - CONFIG.fontSize.name * 0.75;
        const nameY = pageHeight - nameBaselineFromTop;
        page.drawText(nameInput.value, {
            x: CONFIG.textPositions.name.x,
            y: nameY,
            size: CONFIG.fontSize.name,
            font: boldFont,
            color: PDFLib.rgb(CONFIG.fontColor.r, CONFIG.fontColor.g, CONFIG.fontColor.b),
        });
        
        // Код сертификата (жирным)
        const codeCenterFromTop = CONFIG.textPositions.code.y + CONFIG.textPositions.code.h / 2;
        const codeBaselineFromTop = codeCenterFromTop - CONFIG.fontSize.code * 0.75;
        const codeY = pageHeight - codeBaselineFromTop;
        page.drawText(codeInput.value, {
            x: CONFIG.textPositions.code.x,
            y: codeY,
            size: CONFIG.fontSize.code,
            font: boldFont,
            color: PDFLib.rgb(CONFIG.fontColor.r, CONFIG.fontColor.g, CONFIG.fontColor.b),
        });
        
        // Поздравление (обычным, с переносом строк)
        // Оцениваем максимальное количество символов на строку на основе ширины
        // Средняя ширина символа примерно fontSize * 0.6
        const avgCharWidth = CONFIG.fontSize.congrats * 0.6;
        const maxCharsPerLine = Math.floor(CONFIG.congratsMaxWidth / avgCharWidth);
        const congratsLines = splitTextIntoLines(congratsInput.value, maxCharsPerLine);
        const lineHeight = CONFIG.fontSize.congrats + 4;
        
        // Центрируем текст поздравления по вертикали в блоке
        // Высота всего текста (от baseline первой строки до baseline последней строки)
        const totalTextHeight = (congratsLines.length - 1) * lineHeight;
        const congratsYOffset = (CONFIG.textPositions.congrats.h - totalTextHeight) / 2;
        // Baseline первой строки от верха блока (центр блока минус половина высоты текста)
        const firstLineBaselineFromBlockTop = congratsYOffset + CONFIG.fontSize.congrats * 0.75;
        // Baseline первой строки от верха страницы
        const firstLineBaselineFromTop = CONFIG.textPositions.congrats.y + firstLineBaselineFromBlockTop;
        // В PDF координатах (от низа страницы)
        const firstLineY = pageHeight - firstLineBaselineFromTop;
        
        congratsLines.forEach((line, index) => {
            if (line.trim()) { // Пропускаем пустые строки
                page.drawText(line, {
                    x: CONFIG.textPositions.congrats.x,
                    y: firstLineY - (index * lineHeight),
                    size: CONFIG.fontSize.congrats,
                    font: font,
                    color: PDFLib.rgb(CONFIG.fontColor.r, CONFIG.fontColor.g, CONFIG.fontColor.b),
                });
            }
        });
        
        // 5. Сохраняем PDF и предлагаем скачать
        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        
        // Создаем ссылку для скачивания
        const link = document.createElement('a');
        link.href = url;
        link.download = `Certificate_${nameInput.value.replace(/\s+/g, '_')}.pdf`;
        link.style.display = 'none';
        document.body.appendChild(link);
        
        // Программно кликаем по ссылке для скачивания
        try {
            link.click();
            console.log('✅ Скачивание PDF запущено');
        } catch (error) {
            console.error('Ошибка при скачивании:', error);
            // Показываем ссылку пользователю как запасной вариант
            showStatus(`✅ PDF создан! <a href="${url}" download="${link.download}">Скачать PDF</a>`, 'success');
        }
        
        document.body.removeChild(link);
        
        // Освобождаем память
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        
        showStatus(`✅ Сертификат для "${nameInput.value}" успешно создан и скачан!`, 'success');
        
    } catch (error) {
        console.error('Ошибка генерации PDF:', error);
        showStatus(`❌ Ошибка: ${error.message}`, 'error');
    }
}

// Вспомогательная функция для разбивки текста на строки
function splitTextIntoLines(text, maxCharsPerLine, context = null) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0] || '';
    
    // Если передан контекст canvas, используем точное измерение
    if (context) {
        for (let i = 1; i < words.length; i++) {
            const testLine = currentLine + ' ' + words[i];
            const metrics = context.measureText(testLine);
            
            if (metrics.width <= maxCharsPerLine) {
                currentLine = testLine;
            } else {
                lines.push(currentLine);
                currentLine = words[i];
            }
        }
    } else {
        // Простая разбивка по количеству символов
        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            if (currentLine.length + word.length + 1 <= maxCharsPerLine) {
                currentLine += ' ' + word;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
    }
    
    lines.push(currentLine);
    return lines;
}

// Назначаем обработчики событий
previewBtn.addEventListener('click', showPreview);
generateBtn.addEventListener('click', generatePDF);

// Запускаем предпросмотр при изменении текста
[nameInput, codeInput, congratsInput].forEach(input => {
    input.addEventListener('input', () => {
        if (nameInput.value.trim() && codeInput.value.trim()) {
            // Не запускаем автоматически, чтобы не нагружать
            // Можно добавить debounce при необходимости
        }
    });
});

// Инициализация при загрузке DOM
window.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Генератор сертификатов "Бишкек" загружен!');
    console.log('⚙️ Координаты настроены для sert.pdf');
    
    // Проверяем доступность библиотек
    if (typeof PDFLib === 'undefined') {
        console.error('❌ PDFLib не загружен!');
        if (statusDiv) showStatus('Ошибка: библиотека PDFLib не загружена. Проверьте подключение.', 'error');
        return;
    } else {
        console.log('✅ PDFLib загружен');
    }
    
    if (typeof pdfjsLib === 'undefined' && (!window.pdfjsLib)) {
        console.warn('⚠️ pdf.js не загружен (предпросмотр может не работать)');
    } else {
        console.log('✅ pdf.js загружен');
    }
    
        // Загружаем шаблон
        console.log('📄 Начинаю загрузку шаблона PDF...');
        const loaded = await loadTemplatePDF();
        if (!loaded) {
            console.error('❌ Не удалось загрузить шаблон');
            // Статус ошибки уже показан в loadTemplatePDF
        } else {
            console.log('✅ Шаблон загружен, можно работать');
        }
});
