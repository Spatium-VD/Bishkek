// ================= КОНФИГУРАЦИЯ =================
// Настройте эти значения под ваш шаблон sert.png
const CONFIG = {
    // Путь к шаблону (относительно index.html)
    templateUrl: 'assets/sert.png',
    
    // Координаты текста (x, y) в пикселях от левого верхнего угла
    // НАСТРОЙТЕ ЭТИ ЗНАЧЕНИЯ ПОД ВАШ ШАБЛОН!
    textPositions: {
        name: { x: 150, y: 250 },   // Позиция имени
        code: { x: 150, y: 310 },   // Позиция кода
        congrats: { x: 150, y: 370 } // Начальная позиция поздравления
    },
    
    // Настройки шрифтов
    fontSize: {
        name: 44,     // Размер для имени
        code: 24,     // Размер для кода
        congrats: 20  // Размер для поздравления
    },
    
    // Цвет текста (HEX формат)
    fontColor: '#2c3e50',
    
    // Шрифт (стандартные шрифты PDF)
    fontFamily: 'Helvetica-Bold',
    
    // Максимальная ширина текста поздравления (в пикселях)
    congratsMaxWidth: 500
};
// ================= КОНЕЦ КОНФИГУРАЦИИ =================

// Получаем элементы DOM
const nameInput = document.getElementById('name');
const codeInput = document.getElementById('code');
const congratsInput = document.getElementById('congrats');
const previewBtn = document.getElementById('previewBtn');
const generateBtn = document.getElementById('generateBtn');
const previewCanvas = document.getElementById('previewCanvas');
const statusDiv = document.getElementById('status');

// Загружаем изображение шаблона
let templateImage = null;
let isTemplateLoaded = false;

// Функция загрузки шаблона
async function loadTemplateImage() {
    try {
        const response = await fetch(CONFIG.templateUrl);
        const blob = await response.blob();
        return await createImageBitmap(blob);
    } catch (error) {
        showStatus(`Ошибка загрузки шаблона: ${error.message}`, 'error');
        return null;
    }
}

// Инициализация загрузки шаблона при старте
loadTemplateImage().then(image => {
    templateImage = image;
    isTemplateLoaded = true;
    console.log('✅ Шаблон сертификата загружен');
}).catch(error => {
    console.error('Ошибка загрузки шаблона:', error);
});

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
    if (!isTemplateLoaded) {
        showStatus('Шаблон еще загружается. Подождите немного.', 'error');
        return;
    }
    
    if (!nameInput.value.trim() || !codeInput.value.trim()) {
        showStatus('Заполните имя и код для предпросмотра', 'error');
        return;
    }
    
    try {
        // Настраиваем размер canvas под шаблон
        const ctx = previewCanvas.getContext('2d');
        previewCanvas.width = templateImage.width;
        previewCanvas.height = templateImage.height;
        
        // Рисуем шаблон
        ctx.drawImage(templateImage, 0, 0);
        
        // Настраиваем стиль текста
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = CONFIG.fontColor;
        
        // Рисуем имя
        ctx.font = `bold ${CONFIG.fontSize.name}px Arial`;
        ctx.fillText(nameInput.value, CONFIG.textPositions.name.x, CONFIG.textPositions.name.y);
        
        // Рисуем код
        ctx.font = `bold ${CONFIG.fontSize.code}px Arial`;
        ctx.fillText(codeInput.value, CONFIG.textPositions.code.x, CONFIG.textPositions.code.y);
        
        // Рисуем поздравление (с переносом строк)
        ctx.font = `${CONFIG.fontSize.congrats}px Arial`;
        const congratsLines = splitTextIntoLines(
            congratsInput.value, 
            CONFIG.congratsMaxWidth, 
            ctx
        );
        
        const lineHeight = CONFIG.fontSize.congrats + 5;
        congratsLines.forEach((line, index) => {
            ctx.fillText(
                line, 
                CONFIG.textPositions.congrats.x, 
                CONFIG.textPositions.congrats.y + (index * lineHeight)
            );
        });
        
        showStatus('Предпросмотр обновлен. Проверьте расположение текста.', 'success');
        
    } catch (error) {
        console.error('Ошибка предпросмотра:', error);
        showStatus(`Ошибка предпросмотра: ${error.message}`, 'error');
    }
}

// Функция генерации PDF
async function generatePDF() {
    if (!isTemplateLoaded) {
        showStatus('Шаблон еще загружается. Подождите немного.', 'error');
        return;
    }
    
    if (!nameInput.value.trim() || !codeInput.value.trim()) {
        showStatus('Заполните имя и код для генерации сертификата', 'error');
        return;
    }
    
    showStatus('⏳ Создаю PDF-сертификат...', 'success');
    
    try {
        // 1. Создаем PDF документ
        const { PDFDocument } = PDFLib;
        const pdfDoc = await PDFDocument.create();
        
        // 2. Загружаем изображение шаблона в PDF
        const response = await fetch(CONFIG.templateUrl);
        const imageBytes = await response.arrayBuffer();
        let image;
        
        if (CONFIG.templateUrl.toLowerCase().endsWith('.png')) {
            image = await pdfDoc.embedPng(imageBytes);
        } else {
            image = await pdfDoc.embedJpg(imageBytes);
        }
        
        // 3. Добавляем страницу с размерами изображения
        const page = pdfDoc.addPage([image.width, image.height]);
        
        // 4. Рисуем изображение как фон
        page.drawImage(image, {
            x: 0,
            y: 0,
            width: image.width,
            height: image.height
        });
        
        // 5. Загружаем шрифт
        const font = await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);
        
        // 6. Добавляем текст в PDF
        // Имя
        page.drawText(nameInput.value, {
            x: CONFIG.textPositions.name.x,
            y: page.getHeight() - CONFIG.textPositions.name.y,
            size: CONFIG.fontSize.name,
            font: font,
            color: PDFLib.rgbHex(CONFIG.fontColor),
        });
        
        // Код
        page.drawText(codeInput.value, {
            x: CONFIG.textPositions.code.x,
            y: page.getHeight() - CONFIG.textPositions.code.y,
            size: CONFIG.fontSize.code,
            font: font,
            color: PDFLib.rgbHex(CONFIG.fontColor),
        });
        
        // Поздравление (с разбивкой на строки)
        const congratsLines = splitTextIntoLines(congratsInput.value, 60);
        const lineHeight = CONFIG.fontSize.congrats + 2;
        const startY = page.getHeight() - CONFIG.textPositions.congrats.y;
        
        congratsLines.forEach((line, index) => {
            page.drawText(line, {
                x: CONFIG.textPositions.congrats.x,
                y: startY - (index * lineHeight),
                size: CONFIG.fontSize.congrats,
                font: font,
                color: PDFLib.rgbHex(CONFIG.fontColor),
            });
        });
        
        // 7. Сохраняем PDF и предлагаем скачать
        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `Сертификат_${nameInput.value.replace(/\s+/g, '_')}.pdf`;
        document.body.appendChild(link);
        link.click();
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

// Сообщение при загрузке
window.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Генератор сертификатов "Бишкек" загружен!');
    console.log('⚙️ Настройте координаты текста в файле script.js');
});
