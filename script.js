// Global variables
let selectedImages = [];
let currentEditingIndex = -1;
let fabricCanvas = null;
let cropper = null;
let originalImageData = null;
let isCropMode = false;

// DOM elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const imagesSection = document.getElementById('imagesSection');
const imagesGrid = document.getElementById('imagesGrid');
const imageCount = document.getElementById('imageCount');
const generateBtn = document.getElementById('generateBtn');
const editorModal = document.getElementById('editorModal');
const editorCanvas = document.getElementById('editorCanvas');
const cropContainer = document.getElementById('cropContainer');
const cropImage = document.getElementById('cropImage');

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    initializeFabricCanvas();
});

// Setup all event listeners
function setupEventListeners() {
    // File input change
    fileInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop events
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    
    // Click to upload
    uploadArea.addEventListener('click', () => fileInput.click());
    
    // Modal close events
    editorModal.addEventListener('click', function(e) {
        if (e.target === editorModal) {
            closeEditor();
        }
    });
    
    // Keyboard events
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && editorModal.style.display === 'block') {
            closeEditor();
        }
    });
}

// Initialize Fabric.js canvas
function initializeFabricCanvas() {
    fabricCanvas = new fabric.Canvas('editorCanvas', {
        width: 600,
        height: 400,
        backgroundColor: '#f8f9fa'
    });
}

// Handle file selection
function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    processFiles(files);
}

// Handle drag over
function handleDragOver(event) {
    event.preventDefault();
    uploadArea.classList.add('dragover');
}

// Handle drag leave
function handleDragLeave(event) {
    event.preventDefault();
    uploadArea.classList.remove('dragover');
}

// Handle drop
function handleDrop(event) {
    event.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const files = Array.from(event.dataTransfer.files);
    processFiles(files);
}

// Process selected files
function processFiles(files) {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
        alert('Please select image files only.');
        return;
    }
    
    imageFiles.forEach(file => {
        if (!selectedImages.find(img => img.name === file.name)) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const imageData = {
                    name: file.name,
                    file: file,
                    dataUrl: e.target.result,
                    originalDataUrl: e.target.result // Keep original for reset
                };
                selectedImages.push(imageData);
                updateUI();
            };
            reader.readAsDataURL(file);
        }
    });
}

// Update the UI
function updateUI() {
    imageCount.textContent = selectedImages.length;
    
    if (selectedImages.length > 0) {
        imagesSection.style.display = 'block';
        displayImages();
    } else {
        imagesSection.style.display = 'none';
    }
}

// Display images in grid
function displayImages() {
    imagesGrid.innerHTML = '';
    
    selectedImages.forEach((image, index) => {
        const imageItem = document.createElement('div');
        imageItem.className = 'image-item';
        
        imageItem.innerHTML = `
            <img src="${image.dataUrl}" alt="${image.name}">
            <button class="edit-btn" onclick="openEditor(${index})" title="Edit Image">✏️</button>
            <button class="remove-btn" onclick="removeImage(${index})" title="Remove Image">×</button>
            <div class="image-name">${image.name}</div>
        `;
        
        imagesGrid.appendChild(imageItem);
    });
}

// Open image editor
function openEditor(index) {
    currentEditingIndex = index;
    const image = selectedImages[index];
    
    // Load image into canvas
    fabric.Image.fromURL(image.dataUrl, function(img) {
        fabricCanvas.clear();
        
        // Scale image to fit canvas
        const canvasWidth = fabricCanvas.getWidth();
        const canvasHeight = fabricCanvas.getHeight();
        const scaleX = canvasWidth / img.width;
        const scaleY = canvasHeight / img.height;
        const scale = Math.min(scaleX, scaleY) * 0.8;
        
        img.scale(scale);
        img.set({
            left: (canvasWidth - img.width * scale) / 2,
            top: (canvasHeight - img.height * scale) / 2
        });
        
        fabricCanvas.add(img);
        fabricCanvas.setActiveObject(img);
        fabricCanvas.renderAll();
        
        // Store original image data
        originalImageData = image.dataUrl;
        
        // Reset controls
        resetControls();
        
        // Show modal
        editorModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    });
}

// Close editor
function closeEditor() {
    editorModal.style.display = 'none';
    document.body.style.overflow = 'auto';
    fabricCanvas.clear();
    
    // Destroy cropper if exists
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
    
    // Hide crop container
    cropContainer.style.display = 'none';
    editorCanvas.style.display = 'block';
    isCropMode = false;
    
    currentEditingIndex = -1;
    originalImageData = null;
}

// Reset controls
function resetControls() {
    document.getElementById('brightness').value = 0;
    document.getElementById('contrast').value = 0;
    document.getElementById('saturation').value = 0;
    document.getElementById('brightnessValue').textContent = '0';
    document.getElementById('contrastValue').textContent = '0';
    document.getElementById('saturationValue').textContent = '0';
    
    // Reset zoom
    document.getElementById('zoomLevel').value = 1;
    document.getElementById('zoomValue').textContent = '100%';
    
    // Reset aspect ratio
    document.getElementById('aspectRatio').value = 'NaN';
}

// Enable advanced crop mode
function enableAdvancedCrop() {
    if (currentEditingIndex < 0) return;
    
    const image = selectedImages[currentEditingIndex];
    
    // Hide fabric canvas and show crop container
    editorCanvas.style.display = 'none';
    cropContainer.style.display = 'flex';
    
    // Set image source
    cropImage.src = image.dataUrl;
    
    // Initialize cropper
    if (cropper) {
        cropper.destroy();
    }
    
    cropper = new Cropper(cropImage, {
        aspectRatio: NaN,
        viewMode: 1,
        dragMode: 'move',
        autoCropArea: 0.8,
        restore: false,
        guides: true,
        center: true,
        highlight: false,
        cropBoxMovable: true,
        cropBoxResizable: true,
        toggleDragModeOnDblclick: false,
        ready: function() {
            // Set initial zoom
            setZoom();
        }
    });
    
    isCropMode = true;
}

// Reset crop
function resetCrop() {
    if (cropper) {
        cropper.reset();
        setZoom();
    }
}

// Set aspect ratio
function setAspectRatio() {
    if (!cropper) return;
    
    const aspectRatio = parseFloat(document.getElementById('aspectRatio').value);
    cropper.setAspectRatio(isNaN(aspectRatio) ? NaN : aspectRatio);
}

// Set zoom level
function setZoom() {
    if (!cropper) return;
    
    const zoomLevel = parseFloat(document.getElementById('zoomLevel').value);
    const zoomValue = Math.round(zoomLevel * 100);
    
    document.getElementById('zoomValue').textContent = zoomValue + '%';
    
    cropper.zoomTo(zoomLevel);
}

// Apply crop
function applyCrop() {
    if (!cropper) return;
    
    cropper.getCroppedCanvas({
        width: 800,  // Max width
        height: 600, // Max height
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high'
    }).then(function(canvas) {
        // Convert canvas to data URL
        const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
        
        // Update the image data
        selectedImages[currentEditingIndex].dataUrl = croppedDataUrl;
        
        // Destroy cropper
        cropper.destroy();
        cropper = null;
        
        // Hide crop container and show fabric canvas
        cropContainer.style.display = 'none';
        editorCanvas.style.display = 'block';
        isCropMode = false;
        
        // Reload image in fabric canvas
        fabric.Image.fromURL(croppedDataUrl, function(img) {
            fabricCanvas.clear();
            
            const canvasWidth = fabricCanvas.getWidth();
            const canvasHeight = fabricCanvas.getHeight();
            const scaleX = canvasWidth / img.width;
            const scaleY = canvasHeight / img.height;
            const scale = Math.min(scaleX, scaleY) * 0.8;
            
            img.scale(scale);
            img.set({
                left: (canvasWidth - img.width * scale) / 2,
                top: (canvasHeight - img.height * scale) / 2
            });
            
            fabricCanvas.add(img);
            fabricCanvas.setActiveObject(img);
            fabricCanvas.renderAll();
        });
        
        showNotification('Crop applied successfully!', 'success');
    });
}

// Rotate image
function rotateImage(angle) {
    if (isCropMode && cropper) {
        cropper.rotate(angle);
    } else {
        const activeObject = fabricCanvas.getActiveObject();
        if (activeObject) {
            activeObject.rotate((activeObject.angle || 0) + angle);
            fabricCanvas.renderAll();
        }
    }
}

// Flip image
function flipImage(direction) {
    if (isCropMode && cropper) {
        if (direction === 'horizontal') {
            cropper.scaleX(-cropper.getData().scaleX || -1);
        } else {
            cropper.scaleY(-cropper.getData().scaleY || -1);
        }
    } else {
        const activeObject = fabricCanvas.getActiveObject();
        if (activeObject) {
            if (direction === 'horizontal') {
                activeObject.set('flipX', !activeObject.flipX);
            } else {
                activeObject.set('flipY', !activeObject.flipY);
            }
            fabricCanvas.renderAll();
        }
    }
}

// Adjust brightness
function adjustBrightness() {
    if (isCropMode) return; // Don't apply filters in crop mode
    
    const value = document.getElementById('brightness').value;
    document.getElementById('brightnessValue').textContent = value;
    
    const activeObject = fabricCanvas.getActiveObject();
    if (activeObject) {
        activeObject.filters = activeObject.filters || [];
        
        // Remove existing brightness filter
        activeObject.filters = activeObject.filters.filter(f => f.type !== 'brightness');
        
        if (value != 0) {
            activeObject.filters.push(new fabric.Image.filters.Brightness({
                brightness: value / 100
            }));
        }
        
        activeObject.applyFilters();
        fabricCanvas.renderAll();
    }
}

// Adjust contrast
function adjustContrast() {
    if (isCropMode) return; // Don't apply filters in crop mode
    
    const value = document.getElementById('contrast').value;
    document.getElementById('contrastValue').textContent = value;
    
    const activeObject = fabricCanvas.getActiveObject();
    if (activeObject) {
        activeObject.filters = activeObject.filters || [];
        
        // Remove existing contrast filter
        activeObject.filters = activeObject.filters.filter(f => f.type !== 'contrast');
        
        if (value != 0) {
            activeObject.filters.push(new fabric.Image.filters.Contrast({
                contrast: value / 100
            }));
        }
        
        activeObject.applyFilters();
        fabricCanvas.renderAll();
    }
}

// Adjust saturation
function adjustSaturation() {
    if (isCropMode) return; // Don't apply filters in crop mode
    
    const value = document.getElementById('saturation').value;
    document.getElementById('saturationValue').textContent = value;
    
    const activeObject = fabricCanvas.getActiveObject();
    if (activeObject) {
        activeObject.filters = activeObject.filters || [];
        
        // Remove existing saturation filter
        activeObject.filters = activeObject.filters.filter(f => f.type !== 'saturation');
        
        if (value != 0) {
            activeObject.filters.push(new fabric.Image.filters.Saturation({
                saturation: value / 100
            }));
        }
        
        activeObject.applyFilters();
        fabricCanvas.renderAll();
    }
}

// Reset image to original
function resetImage() {
    if (originalImageData && currentEditingIndex >= 0) {
        // Destroy cropper if in crop mode
        if (cropper) {
            cropper.destroy();
            cropper = null;
        }
        
        // Hide crop container and show fabric canvas
        cropContainer.style.display = 'none';
        editorCanvas.style.display = 'block';
        isCropMode = false;
        
        fabric.Image.fromURL(originalImageData, function(img) {
            fabricCanvas.clear();
            
            const canvasWidth = fabricCanvas.getWidth();
            const canvasHeight = fabricCanvas.getHeight();
            const scaleX = canvasWidth / img.width;
            const scaleY = canvasHeight / img.height;
            const scale = Math.min(scaleX, scaleY) * 0.8;
            
            img.scale(scale);
            img.set({
                left: (canvasWidth - img.width * scale) / 2,
                top: (canvasHeight - img.height * scale) / 2
            });
            
            fabricCanvas.add(img);
            fabricCanvas.setActiveObject(img);
            fabricCanvas.renderAll();
            
            resetControls();
        });
        
        // Reset the image data to original
        selectedImages[currentEditingIndex].dataUrl = originalImageData;
    }
}

// Save edits
function saveEdits() {
    if (currentEditingIndex >= 0) {
        let dataUrl;
        
        if (isCropMode && cropper) {
            // Get cropped data if in crop mode
            cropper.getCroppedCanvas({
                width: 800,
                height: 600,
                imageSmoothingEnabled: true,
                imageSmoothingQuality: 'high'
            }).then(function(canvas) {
                dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                selectedImages[currentEditingIndex].dataUrl = dataUrl;
                updateUI();
                closeEditor();
                showNotification('Image edited successfully!', 'success');
            });
        } else {
            // Get fabric canvas data
            dataUrl = fabricCanvas.toDataURL({
                format: 'jpeg',
                quality: 0.9
            });
            
            selectedImages[currentEditingIndex].dataUrl = dataUrl;
            updateUI();
            closeEditor();
            showNotification('Image edited successfully!', 'success');
        }
    }
}

// Remove image
function removeImage(index) {
    selectedImages.splice(index, 1);
    updateUI();
    fileInput.value = '';
}

// Clear all images
function clearImages() {
    selectedImages = [];
    updateUI();
    fileInput.value = '';
}

// Generate PDF
async function generatePDF() {
    if (selectedImages.length === 0) {
        alert('Please select at least one image.');
        return;
    }
    
    // Show loading state
    generateBtn.classList.add('loading');
    generateBtn.disabled = true;
    
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Set initial position
        let yPosition = 20;
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;
        const maxWidth = pageWidth - (2 * margin);
        const maxHeight = pageHeight - (2 * margin);
        
        for (let i = 0; i < selectedImages.length; i++) {
            const image = selectedImages[i];
            
            // Create a new page for each image (except the first one)
            if (i > 0) {
                doc.addPage();
                yPosition = 20;
            }
            
            // Load image
            const img = new Image();
            img.src = image.dataUrl;
            
            await new Promise((resolve) => {
                img.onload = function() {
                    // Calculate dimensions to fit the page
                    let imgWidth = img.width;
                    let imgHeight = img.height;
                    
                    // Scale down if image is too large
                    if (imgWidth > maxWidth || imgHeight > maxHeight) {
                        const scaleX = maxWidth / imgWidth;
                        const scaleY = maxHeight / imgHeight;
                        const scale = Math.min(scaleX, scaleY);
                        
                        imgWidth *= scale;
                        imgHeight *= scale;
                    }
                    
                    // Center the image horizontally
                    const xPosition = (pageWidth - imgWidth) / 2;
                    
                    // Add image to PDF
                    doc.addImage(image.dataUrl, 'JPEG', xPosition, yPosition, imgWidth, imgHeight);
                    
                    // Add image name below the image
                    const textY = yPosition + imgHeight + 10;
                    if (textY < pageHeight - 20) {
                        doc.setFontSize(12);
                        doc.setTextColor(100, 100, 100);
                        doc.text(image.name, margin, textY);
                    }
                    
                    resolve();
                };
            });
        }
        
        // Save the PDF
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        doc.save(`images_${timestamp}.pdf`);
        
        // Show success message
        showNotification('PDF generated successfully!', 'success');
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        showNotification('Error generating PDF. Please try again.', 'error');
    } finally {
        // Hide loading state
        generateBtn.classList.remove('loading');
        generateBtn.disabled = false;
    }
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Style the notification
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 1000;
        animation: slideIn 0.3s ease;
        max-width: 300px;
    `;
    
    // Set background color based on type
    if (type === 'success') {
        notification.style.backgroundColor = '#28a745';
    } else if (type === 'error') {
        notification.style.backgroundColor = '#dc3545';
    } else {
        notification.style.backgroundColor = '#17a2b8';
    }
    
    // Add to page
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Add slideOut animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style); 