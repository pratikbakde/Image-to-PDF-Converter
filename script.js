// Global variables
let images = [];
let currentEditingIndex = -1;
let fabricCanvas = null;
let cropper = null;
let isCropMode = false;
let originalImageData = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    setupDragAndDrop();
    setupEventListeners();
    setupCameraAndMedia();
    updateImageCount();
}

// Setup drag and drop functionality
function setupDragAndDrop() {
    const uploadArea = document.getElementById('uploadArea');
    
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        
        const files = Array.from(e.dataTransfer.files);
        const imageFiles = files.filter(file => file.type.startsWith('image/'));
        
        if (imageFiles.length > 0) {
            addImages(imageFiles);
        }
    });
}

// Setup event listeners
function setupEventListeners() {
    // Close modal when clicking outside
    window.addEventListener('click', function(e) {
        const modal = document.getElementById('editorModal');
        if (e.target === modal) {
            closeEditor();
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeEditor();
        }
    });
}

// Setup camera and media functionality
function setupCameraAndMedia() {
    const cameraBtn = document.getElementById('cameraBtn');
    const mediaBtn = document.getElementById('mediaBtn');
    const cameraInput = document.getElementById('cameraInput');
    const mediaInput = document.getElementById('mediaInput');
    
    // Camera button click handler
    cameraBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        openCamera();
    });
    
    // Media button click handler
    mediaBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        openMedia();
    });
    
    // Camera input change handler
    cameraInput.addEventListener('change', function(event) {
        handleCameraSelect(event);
    });
    
    // Media input change handler
    mediaInput.addEventListener('change', function(event) {
        handleFileSelect(event);
    });
}

// Camera functionality
function openCamera() {
    console.log('Opening camera...');
    const cameraInput = document.getElementById('cameraInput');
    
    // Check if camera is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Camera is not supported in this browser. Please use a modern browser or try the media option instead.');
        return;
    }
    
    // Try to access camera first to ensure it's available
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(function(stream) {
            // Camera is available, trigger file input
            stream.getTracks().forEach(track => track.stop()); // Stop the stream
            cameraInput.click();
        })
        .catch(function(err) {
            console.log('Camera access denied or not available:', err);
            // Still try to open camera input as fallback
            cameraInput.click();
        });
}

function handleCameraSelect(event) {
    console.log('Camera file selected:', event.target.files);
    const files = Array.from(event.target.files);
    if (files.length > 0) {
        addImages(files);
    }
    // Reset input for future use
    event.target.value = '';
}

// Media functionality
function openMedia() {
    console.log('Opening media picker...');
    const mediaInput = document.getElementById('mediaInput');
    mediaInput.click();
}

function handleFileSelect(event) {
    console.log('Media files selected:', event.target.files);
    const files = Array.from(event.target.files);
    if (files.length > 0) {
        addImages(files);
    }
    // Reset input for future use
    event.target.value = '';
}

// Add images to the collection
function addImages(files) {
    console.log('Adding images:', files.length);
    files.forEach(file => {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const imageData = {
                    id: Date.now() + Math.random(),
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    dataUrl: e.target.result,
                    originalDataUrl: e.target.result
                };
                
                images.push(imageData);
                updateImageDisplay();
                updateImageCount();
                
                // Show images section if hidden
                const imagesSection = document.getElementById('imagesSection');
                if (imagesSection.style.display === 'none') {
                    imagesSection.style.display = 'block';
                }
            };
            reader.readAsDataURL(file);
        }
    });
}

// Update image display
function updateImageDisplay() {
    const imagesGrid = document.getElementById('imagesGrid');
    imagesGrid.innerHTML = '';
    
    images.forEach((image, index) => {
        const imageItem = document.createElement('div');
        imageItem.className = 'image-item';
        imageItem.innerHTML = `
            <img src="${image.dataUrl}" alt="${image.name}" onclick="editImage(${index})">
            <button class="edit-btn" onclick="editImage(${index})" title="Edit Image">✏️</button>
            <button class="remove-btn" onclick="removeImage(${index})" title="Remove Image">×</button>
            <div class="image-name">${image.name}</div>
            <div class="image-size">${formatFileSize(image.size)}</div>
        `;
        imagesGrid.appendChild(imageItem);
    });
}

// Update image count
function updateImageCount() {
    const imageCount = document.getElementById('imageCount');
    imageCount.textContent = images.length;
    
    const generateBtn = document.getElementById('generateBtn');
    generateBtn.disabled = images.length === 0;
}

// Remove image
function removeImage(index) {
    images.splice(index, 1);
    updateImageDisplay();
    updateImageCount();
    
    if (images.length === 0) {
        const imagesSection = document.getElementById('imagesSection');
        imagesSection.style.display = 'none';
    }
}

// Clear all images
function clearImages() {
    images = [];
    updateImageDisplay();
    updateImageCount();
    
    const imagesSection = document.getElementById('imagesSection');
    imagesSection.style.display = 'none';
}

// Edit image
function editImage(index) {
    currentEditingIndex = index;
    const image = images[index];
    originalImageData = image.originalDataUrl;
    
    // Show modal
    const modal = document.getElementById('editorModal');
    modal.style.display = 'flex';
    
    // Initialize canvas with image
    initializeFabricCanvas(image.dataUrl);
    
    // Reset controls
    resetControls();
}

// Initialize Fabric.js canvas
function initializeFabricCanvas(imageDataUrl) {
    const canvas = document.getElementById('editorCanvas');
    const cropContainer = document.getElementById('cropContainer');
    
    // Hide crop container initially
    cropContainer.style.display = 'none';
    canvas.style.display = 'block';
    
    // Destroy existing canvas
    if (fabricCanvas) {
        fabricCanvas.dispose();
    }
    
    // Create new canvas
    fabricCanvas = new fabric.Canvas('editorCanvas', {
        width: 400,
        height: 300
    });
    
    // Load image
    fabric.Image.fromURL(imageDataUrl, function(img) {
        // Scale image to fit canvas
        const canvasWidth = fabricCanvas.width;
        const canvasHeight = fabricCanvas.height;
        const imgRatio = img.width / img.height;
        const canvasRatio = canvasWidth / canvasHeight;
        
        let scaleX, scaleY;
        if (imgRatio > canvasRatio) {
            scaleX = canvasWidth / img.width;
            scaleY = scaleX;
        } else {
            scaleY = canvasHeight / img.height;
            scaleX = scaleY;
        }
        
        img.scaleX = scaleX;
        img.scaleY = scaleY;
        img.left = (canvasWidth - img.width * scaleX) / 2;
        img.top = (canvasHeight - img.height * scaleY) / 2;
        
        fabricCanvas.add(img);
        fabricCanvas.renderAll();
    });
}

// Reset controls to default values
function resetControls() {
    document.getElementById('brightness').value = 0;
    document.getElementById('contrast').value = 0;
    document.getElementById('saturation').value = 0;
    document.getElementById('zoomLevel').value = 1;
    
    // Update display values
    document.getElementById('brightnessValue').textContent = '0';
    document.getElementById('contrastValue').textContent = '0';
    document.getElementById('saturationValue').textContent = '0';
    document.getElementById('zoomValue').textContent = '100%';
    
    // Reset aspect ratio
    document.getElementById('aspectRatio').value = 'NaN';
}

// Rotate image
function rotateImage(angle) {
    if (!fabricCanvas || fabricCanvas.getObjects().length === 0) return;
    
    const img = fabricCanvas.getObjects()[0];
    img.rotate = (img.rotate || 0) + angle;
    fabricCanvas.renderAll();
}

// Flip image
function flipImage(direction) {
    if (!fabricCanvas || fabricCanvas.getObjects().length === 0) return;
    
    const img = fabricCanvas.getObjects()[0];
    if (direction === 'horizontal') {
        img.flipX = !img.flipX;
    } else if (direction === 'vertical') {
        img.flipY = !img.flipY;
    }
    fabricCanvas.renderAll();
}

// Adjust brightness
function adjustBrightness() {
    if (!fabricCanvas || fabricCanvas.getObjects().length === 0) return;
    
    const brightness = document.getElementById('brightness').value;
    const img = fabricCanvas.getObjects()[0];
    
    // Update display value
    document.getElementById('brightnessValue').textContent = brightness;
    
    // Apply brightness filter
    img.filters = img.filters || [];
    const brightnessFilter = new fabric.Image.filters.Brightness({
        brightness: brightness / 100
    });
    
    // Remove existing brightness filter
    img.filters = img.filters.filter(filter => !(filter instanceof fabric.Image.filters.Brightness));
    img.filters.push(brightnessFilter);
    
    img.applyFilters();
    fabricCanvas.renderAll();
}

// Adjust contrast
function adjustContrast() {
    if (!fabricCanvas || fabricCanvas.getObjects().length === 0) return;
    
    const contrast = document.getElementById('contrast').value;
    const img = fabricCanvas.getObjects()[0];
    
    // Update display value
    document.getElementById('contrastValue').textContent = contrast;
    
    // Apply contrast filter
    img.filters = img.filters || [];
    const contrastFilter = new fabric.Image.filters.Contrast({
        contrast: contrast / 100
    });
    
    // Remove existing contrast filter
    img.filters = img.filters.filter(filter => !(filter instanceof fabric.Image.filters.Contrast));
    img.filters.push(contrastFilter);
    
    img.applyFilters();
    fabricCanvas.renderAll();
}

// Adjust saturation
function adjustSaturation() {
    if (!fabricCanvas || fabricCanvas.getObjects().length === 0) return;
    
    const saturation = document.getElementById('saturation').value;
    const img = fabricCanvas.getObjects()[0];
    
    // Update display value
    document.getElementById('saturationValue').textContent = saturation;
    
    // Apply saturation filter
    img.filters = img.filters || [];
    const saturationFilter = new fabric.Image.filters.Saturation({
        saturation: saturation / 100
    });
    
    // Remove existing saturation filter
    img.filters = img.filters.filter(filter => !(filter instanceof fabric.Image.filters.Saturation));
    img.filters.push(saturationFilter);
    
    img.applyFilters();
    fabricCanvas.renderAll();
}

// Enable advanced crop
function enableAdvancedCrop() {
    isCropMode = true;
    const canvas = document.getElementById('editorCanvas');
    const cropContainer = document.getElementById('cropContainer');
    const cropImage = document.getElementById('cropImage');
    
    // Hide canvas and show crop container
    canvas.style.display = 'none';
    cropContainer.style.display = 'block';
    
    // Get current image data
    const currentImage = images[currentEditingIndex];
    cropImage.src = currentImage.dataUrl;
    
    // Initialize cropper
    if (cropper) {
        cropper.destroy();
    }
    
    cropper = new Cropper(cropImage, {
        aspectRatio: NaN,
        viewMode: 1,
        dragMode: 'move',
        autoCropArea: 1,
        restore: false,
        guides: true,
        center: true,
        highlight: false,
        cropBoxMovable: true,
        cropBoxResizable: true,
        toggleDragModeOnDblclick: false,
        zoomable: true,
        zoomOnWheel: true,
        wheelZoomRatio: 0.1,
        ready: function() {
            // Set initial aspect ratio if selected
            const aspectRatio = document.getElementById('aspectRatio').value;
            if (aspectRatio !== 'NaN') {
                cropper.setAspectRatio(parseFloat(aspectRatio));
            }
        }
    });
}

// Set aspect ratio
function setAspectRatio() {
    if (!cropper) return;
    
    const aspectRatio = document.getElementById('aspectRatio').value;
    if (aspectRatio === 'NaN') {
        cropper.setAspectRatio(NaN);
    } else {
        cropper.setAspectRatio(parseFloat(aspectRatio));
    }
}

// Set zoom level
function setZoom() {
    if (!cropper) return;
    
    const zoomLevel = document.getElementById('zoomLevel').value;
    document.getElementById('zoomValue').textContent = Math.round(zoomLevel * 100) + '%';
    
    cropper.zoomTo(zoomLevel);
}

// Reset crop
function resetCrop() {
    if (cropper) {
        cropper.reset();
        // Reset zoom
        document.getElementById('zoomLevel').value = 1;
        document.getElementById('zoomValue').textContent = '100%';
    }
}

// Apply crop
function applyCrop() {
    if (!cropper) return;
    
    const canvas = cropper.getCroppedCanvas();
    const croppedDataUrl = canvas.toDataURL('image/png');
    
    // Update the image data
    images[currentEditingIndex].dataUrl = croppedDataUrl;
    
    // Exit crop mode
    exitCropMode();
    
    // Reinitialize fabric canvas with cropped image
    initializeFabricCanvas(croppedDataUrl);
}

// Exit crop mode
function exitCropMode() {
    isCropMode = false;
    const canvas = document.getElementById('editorCanvas');
    const cropContainer = document.getElementById('cropContainer');
    
    canvas.style.display = 'block';
    cropContainer.style.display = 'none';
    
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
}

// Reset image to original
function resetImage() {
    if (currentEditingIndex >= 0 && originalImageData) {
        images[currentEditingIndex].dataUrl = originalImageData;
        initializeFabricCanvas(originalImageData);
        resetControls();
    }
}

// Save edits
function saveEdits() {
    if (!fabricCanvas || fabricCanvas.getObjects().length === 0) return;
    
    const canvas = fabricCanvas.getElement();
    const dataUrl = canvas.toDataURL('image/png');
    
    // Update the image data
    images[currentEditingIndex].dataUrl = dataUrl;
    
    // Update display
    updateImageDisplay();
    
    // Close editor
    closeEditor();
}

// Close editor
function closeEditor() {
    const modal = document.getElementById('editorModal');
    modal.style.display = 'none';
    
    // Clean up
    if (fabricCanvas) {
        fabricCanvas.dispose();
        fabricCanvas = null;
    }
    
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
    
    isCropMode = false;
    currentEditingIndex = -1;
    originalImageData = null;
}

// Generate PDF
function generatePDF() {
    if (images.length === 0) {
        alert('Please add at least one image to generate PDF.');
        return;
    }
    
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.style.display = 'flex';
    
    // Create PDF document
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();
    
    let currentPage = 1;
    const maxImagesPerPage = 1; // One image per page for better quality
    
    for (let i = 0; i < images.length; i++) {
        const image = images[i];
        
        // Add new page for each image (except the first one)
        if (i > 0) {
            pdf.addPage();
            currentPage++;
        }
        
        // Load image and add to PDF
        const img = new Image();
        img.onload = function() {
            const imgWidth = pdf.internal.pageSize.getWidth();
            const imgHeight = (img.height * imgWidth) / img.width;
            
            // Check if image fits on page
            const pageHeight = pdf.internal.pageSize.getHeight();
            if (imgHeight > pageHeight) {
                // Scale down to fit
                const scale = pageHeight / imgHeight;
                const scaledWidth = imgWidth * scale;
                const scaledHeight = imgHeight * scale;
                
                pdf.addImage(image.dataUrl, 'JPEG', (imgWidth - scaledWidth) / 2, 0, scaledWidth, scaledHeight);
            } else {
                // Center image on page
                const yOffset = (pageHeight - imgHeight) / 2;
                pdf.addImage(image.dataUrl, 'JPEG', 0, yOffset, imgWidth, imgHeight);
            }
            
            // If this is the last image, save the PDF
            if (i === images.length - 1) {
                setTimeout(() => {
                    pdf.save('images-to-pdf.pdf');
                    loadingOverlay.style.display = 'none';
                }, 100);
            }
        };
        
        img.src = image.dataUrl;
    }
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
