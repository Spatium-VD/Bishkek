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
        const { PDFDocument, StandardFonts } = PDFLib;
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
        
        // 5. ЗАГРУЖАЕМ ШРИФТ С ПОДДЕРЖКОЙ КИРИЛЛИЦЫ
        // Альтернативный вариант - использовать Times-Roman (есть кириллица)
        const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
        const boldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
        
        // 6. Добавляем текст в PDF
        // Имя (жирным)
        page.drawText(nameInput.value, {
            x: CONFIG.textPositions.name.x,
            y: page.getHeight() - CONFIG.textPositions.name.y,
            size: CONFIG.fontSize.name,
            font: boldFont,
            color: PDFLib.rgb(CONFIG.fontColor.r, CONFIG.fontColor.g, CONFIG.fontColor.b),
        });
        
        // Код (жирным)
        page.drawText(codeInput.value, {
            x: CONFIG.textPositions.code.x,
            y: page.getHeight() - CONFIG.textPositions.code.y,
            size: CONFIG.fontSize.code,
            font: boldFont,
            color: PDFLib.rgb(CONFIG.fontColor.r, CONFIG.fontColor.g, CONFIG.fontColor.b),
        });
        
        // Поздравление (обычным)
        const congratsLines = splitTextIntoLines(congratsInput.value, 60);
        const lineHeight = CONFIG.fontSize.congrats + 2;
        const startY = page.getHeight() - CONFIG.textPositions.congrats.y;
        
        congratsLines.forEach((line, index) => {
            page.drawText(line, {
                x: CONFIG.textPositions.congrats.x,
                y: startY - (index * lineHeight),
                size: CONFIG.fontSize.congrats,
                font: font,
                color: PDFLib.rgb(CONFIG.fontColor.r, CONFIG.fontColor.g, CONFIG.fontColor.b),
            });
        });
        
        // 7. Сохраняем PDF и предлагаем скачать
        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `Certificate_${nameInput.value.replace(/\s+/g, '_')}.pdf`;
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
