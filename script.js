// Global variables
let images = [];
let currentEditingIndex = -1;
let fabricCanvas = null;
let cropper = null;
let isCropMode = false;
let originalImageData = null;

// Camera modal functionality
let cameraStream = null;
let facingMode = 'environment'; // Start with back camera

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
        
        const cameraModal = document.getElementById('cameraModal');
        if (e.target === cameraModal) {
            closeCameraModal();
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeEditor();
            closeCameraModal();
        }
    });
    
    // Add touch event listeners for better mobile experience
    document.addEventListener('touchstart', function(e) {
        // Prevent zoom on double tap
        if (e.touches.length > 1) {
            e.preventDefault();
        }
    }, { passive: false });
}

// Setup camera and media functionality
function setupCameraAndMedia() {
    const cameraBtn = document.getElementById('cameraBtn');
    const mediaBtn = document.getElementById('mediaBtn');
    const mediaInput = document.getElementById('mediaInput');
    
    // Camera button click handler
    cameraBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        openCameraModal();
    });
    
    // Media button click handler
    mediaBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        mediaInput.click();
    });
    
    // Media input change handler
    mediaInput.addEventListener('change', function(event) {
        handleFileSelect(event);
    });
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
            <img src="${image.dataUrl}" alt="${image.name}">
            <button class="edit-btn" onclick="editImage(${index})" title="Edit Image">✏️</button>
            <button class="remove-btn" onclick="removeImage(${index})" title="Remove Image">×</button>
            <div class="image-name">${image.name}</div>
            <div class="image-size">${formatFileSize(image.size)}</div>
        `;
        
        // Add click event to the entire image item for better mobile experience
        imageItem.addEventListener('click', function(e) {
            // Don't trigger if clicking on buttons
            if (e.target.classList.contains('edit-btn') || e.target.classList.contains('remove-btn')) {
                return;
            }
            editImage(index);
        });
        
        imagesGrid.appendChild(imageItem);
    });
}

// Update image count
function updateImageCount() {
    const count = images.length;
    document.getElementById('imageCount').textContent = count;
    
    // Show/hide generate button based on image count
    const generateBtn = document.getElementById('generateBtn');
    if (count > 0) {
        generateBtn.style.display = 'flex';
    } else {
        generateBtn.style.display = 'none';
    }
}

// Remove image
function removeImage(index) {
    images.splice(index, 1);
    updateImageDisplay();
    updateImageCount();
    
    // Hide images section if no images
    if (images.length === 0) {
        document.getElementById('imagesSection').style.display = 'none';
    }
}

// Clear all images
function clearImages() {
    images = [];
    updateImageDisplay();
    updateImageCount();
    document.getElementById('imagesSection').style.display = 'none';
}

// Edit image
function editImage(index) {
    currentEditingIndex = index;
    const image = images[index];
    originalImageData = image.originalDataUrl;
    
    // Show modal
    const modal = document.getElementById('editorModal');
    modal.style.display = 'block';
    
    // Initialize fabric canvas
    initializeFabricCanvas(image.dataUrl);
    
    // Reset controls
    resetControls();
}

// Initialize fabric canvas
function initializeFabricCanvas(imageDataUrl) {
    const canvas = document.getElementById('editorCanvas');
    const cropContainer = document.getElementById('cropContainer');
    
    // Show canvas, hide crop container
    canvas.style.display = 'block';
    cropContainer.style.display = 'none';
    
    // Dispose of existing canvas
    if (fabricCanvas) {
        fabricCanvas.dispose();
    }
    
    // Create new fabric canvas with larger size to accommodate rotated images
    fabricCanvas = new fabric.Canvas('editorCanvas', {
        width: 600,
        height: 600,
        backgroundColor: '#f8f9fa'
    });
    
    // Load image
    fabric.Image.fromURL(imageDataUrl, function(img) {
        // Scale image to fit canvas (leaving some margin for rotation)
        const canvasWidth = fabricCanvas.getWidth();
        const canvasHeight = fabricCanvas.getHeight();
        const imgRatio = img.width / img.height;
        const canvasRatio = canvasWidth / canvasHeight;
        
        let scaleX, scaleY;
        if (imgRatio > canvasRatio) {
            scaleX = (canvasWidth * 0.8) / img.width; // 80% of canvas width
            scaleY = scaleX;
        } else {
            scaleY = (canvasHeight * 0.8) / img.height; // 80% of canvas height
            scaleX = scaleY;
        }
        
        img.scaleX = scaleX;
        img.scaleY = scaleY;
        
        // Center the image and set origin to center for proper rotation
        img.set({
            left: canvasWidth / 2,
            top: canvasHeight / 2,
            originX: 'center',
            originY: 'center'
        });
        
        fabricCanvas.add(img);
        fabricCanvas.renderAll();
    });
}

// Reset controls to default values
function resetControls() {
    document.getElementById('brightness').value = 0;
    document.getElementById('contrast').value = 0;
    document.getElementById('saturation').value = 0;
    document.getElementById('brightnessValue').textContent = '0';
    document.getElementById('contrastValue').textContent = '0';
    document.getElementById('saturationValue').textContent = '0';
    document.getElementById('aspectRatio').value = '1';
    document.getElementById('zoomLevel').value = 1;
    document.getElementById('zoomValue').textContent = '100%';
}

// Rotate image
function rotateImage(angle) {
    console.log('Rotate function called with angle:', angle);
    
    if (!fabricCanvas) {
        console.log('Fabric canvas not initialized');
        return;
    }
    
    const objects = fabricCanvas.getObjects();
    if (objects.length === 0) {
        console.log('No objects in canvas');
        return;
    }
    
    // Get the image object
    const obj = objects[0];
    
    // Get current rotation and add the new angle
    const currentRotation = obj.angle || 0;
    const newRotation = currentRotation + angle;
    
    // Set the new rotation
    obj.set('angle', newRotation);
    
    // Get canvas dimensions
    const canvasWidth = fabricCanvas.getWidth();
    const canvasHeight = fabricCanvas.getHeight();
    
    // Center the object in the canvas
    obj.set({
        left: canvasWidth / 2,
        top: canvasHeight / 2,
        originX: 'center',
        originY: 'center'
    });
    
    // Update object coordinates
    obj.setCoords();
    
    // Force canvas to update
    fabricCanvas.requestRenderAll();
    
    console.log('Image rotated by', angle, 'degrees. New rotation:', newRotation);
}

// Flip image
function flipImage(direction) {
    if (!fabricCanvas || fabricCanvas.getObjects().length === 0) return;
    
    const obj = fabricCanvas.getActiveObject() || fabricCanvas.getObjects()[0];
    
    if (direction === 'horizontal') {
        obj.flipX = !obj.flipX;
    } else if (direction === 'vertical') {
        obj.flipY = !obj.flipY;
    }
    
    fabricCanvas.renderAll();
}

// Adjust brightness
function adjustBrightness() {
    if (!fabricCanvas || fabricCanvas.getObjects().length === 0) return;
    
    const brightness = document.getElementById('brightness').value;
    document.getElementById('brightnessValue').textContent = brightness;
    
    const obj = fabricCanvas.getActiveObject() || fabricCanvas.getObjects()[0];
    
    // Apply brightness filter
    const filters = obj.filters || [];
    let brightnessFilter = filters.find(f => f.type === 'brightness');
    
    if (!brightnessFilter) {
        brightnessFilter = new fabric.Image.filters.Brightness({
            brightness: brightness / 100
        });
        filters.push(brightnessFilter);
    } else {
        brightnessFilter.brightness = brightness / 100;
    }
    
    obj.filters = filters;
    obj.applyFilters();
    fabricCanvas.renderAll();
}

// Adjust contrast
function adjustContrast() {
    if (!fabricCanvas || fabricCanvas.getObjects().length === 0) return;
    
    const contrast = document.getElementById('contrast').value;
    document.getElementById('contrastValue').textContent = contrast;
    
    const obj = fabricCanvas.getActiveObject() || fabricCanvas.getObjects()[0];
    
    // Apply contrast filter
    const filters = obj.filters || [];
    let contrastFilter = filters.find(f => f.type === 'contrast');
    
    if (!contrastFilter) {
        contrastFilter = new fabric.Image.filters.Contrast({
            contrast: contrast / 100
        });
        filters.push(contrastFilter);
    } else {
        contrastFilter.contrast = contrast / 100;
    }
    
    obj.filters = filters;
    obj.applyFilters();
    fabricCanvas.renderAll();
}

// Adjust saturation
function adjustSaturation() {
    if (!fabricCanvas || fabricCanvas.getObjects().length === 0) return;
    
    const saturation = document.getElementById('saturation').value;
    document.getElementById('saturationValue').textContent = saturation;
    
    const obj = fabricCanvas.getActiveObject() || fabricCanvas.getObjects()[0];
    
    // Apply saturation filter
    const filters = obj.filters || [];
    let saturationFilter = filters.find(f => f.type === 'saturation');
    
    if (!saturationFilter) {
        saturationFilter = new fabric.Image.filters.Saturation({
            saturation: saturation / 100
        });
        filters.push(saturationFilter);
    } else {
        saturationFilter.saturation = saturation / 100;
    }
    
    obj.filters = filters;
    obj.applyFilters();
    fabricCanvas.renderAll();
}

// Enable advanced crop
function enableAdvancedCrop() {
    if (currentEditingIndex < 0) return;
    
    isCropMode = true;
    const canvas = document.getElementById('editorCanvas');
    const cropContainer = document.getElementById('cropContainer');
    const cropImage = document.getElementById('cropImage');
    
    // Hide canvas, show crop container
    canvas.style.display = 'none';
    cropContainer.style.display = 'block';
    
    // Set crop image
    cropImage.src = images[currentEditingIndex].dataUrl;
    
    // Initialize cropper
    if (cropper) {
        cropper.destroy();
    }
    
    cropper = new Cropper(cropImage, {
        aspectRatio: 1, // Default to square crop
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
        zoomable: true,
        zoomOnWheel: true,
        wheelZoomRatio: 0.1,
        ready: function() {
            // Set initial aspect ratio if selected
            const aspectRatio = document.getElementById('aspectRatio').value;
            if (aspectRatio !== 'NaN') {
                cropper.setAspectRatio(parseFloat(aspectRatio));
            } else {
                // Default to square if no aspect ratio is selected
                cropper.setAspectRatio(1);
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

// Save edited image
function saveEditedImage() {
    if (!fabricCanvas || currentEditingIndex < 0) {
        console.log('No canvas or image to save');
        return;
    }
    
    try {
        // Get the current canvas as a data URL
        const editedImageDataUrl = fabricCanvas.toDataURL({
            format: 'png',
            quality: 1
        });
        
        // Update the image in the images array
        images[currentEditingIndex].dataUrl = editedImageDataUrl;
        
        // Update the display
        updateImageDisplay();
        
        // Show success message
        showSaveSuccess();
        
        // Close the editor
        closeEditor();
        
        console.log('Image saved successfully');
        
    } catch (error) {
        console.error('Error saving image:', error);
        alert('Error saving image. Please try again.');
    }
}

// Show save success message
function showSaveSuccess() {
    // Create a temporary success message
    const successMsg = document.createElement('div');
    successMsg.className = 'save-success';
    successMsg.textContent = 'Image saved successfully!';
    successMsg.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 12px 20px;
        border-radius: 5px;
        z-index: 10000;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideInRight 0.3s ease-out;
    `;
    
    document.body.appendChild(successMsg);
    
    // Remove the message after 3 seconds
    setTimeout(() => {
        if (successMsg.parentNode) {
            successMsg.parentNode.removeChild(successMsg);
        }
    }, 3000);
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
    const generateBtn = document.getElementById('generateBtn');
    
    // Show loading state
    loadingOverlay.style.display = 'flex';
    generateBtn.classList.add('loading');
    generateBtn.disabled = true;

    try {
        // Create PDF document
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF();
        
        let processedImages = 0;
        const totalImages = images.length;
        
        // Process images sequentially to avoid memory issues
        function processImage(index) {
            if (index >= totalImages) {
                // All images processed, save PDF
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
                const filename = `images-to-pdf-${timestamp}.pdf`;
                
                try {
                    pdf.save(filename);
                    console.log('PDF generated successfully:', filename);
                    
                    // Show success message
                    setTimeout(() => {
                        alert(`PDF generated successfully!\nFilename: ${filename}\nThe file has been saved to your Downloads folder.`);
                    }, 100);
                } catch (error) {
                    console.error('Error saving PDF:', error);
                    alert('Error saving PDF. Please try again.');
                } finally {
                    // Hide loading state
                    loadingOverlay.style.display = 'none';
                    generateBtn.classList.remove('loading');
                    generateBtn.disabled = false;
                }
                return;
            }

            const image = images[index];
            
            // Create a new page for each image (except the first one)
            if (index > 0) {
                pdf.addPage();
            }

            // Load image and add to PDF
            const img = new Image();
            
            img.onload = function() {
                try {
                    const pageWidth = pdf.internal.pageSize.getWidth();
                    const pageHeight = pdf.internal.pageSize.getHeight();
                    
                    // Calculate image dimensions to fit on page
                    let imgWidth = pageWidth;
                    let imgHeight = (img.height * imgWidth) / img.width;
                    
                    // If image is too tall, scale it down
                    if (imgHeight > pageHeight) {
                        const scale = pageHeight / imgHeight;
                        imgWidth = imgWidth * scale;
                        imgHeight = imgHeight * scale;
                    }
                    
                    // Center image on page
                    const xOffset = (pageWidth - imgWidth) / 2;
                    const yOffset = (pageHeight - imgHeight) / 2;
                    
                    // Add image to PDF
                    pdf.addImage(image.dataUrl, 'JPEG', xOffset, yOffset, imgWidth, imgHeight);
                    
                    processedImages++;
                    console.log(`Processed image ${processedImages}/${totalImages}`);
                    
                    // Process next image
                    setTimeout(() => processImage(index + 1), 50);
                    
                } catch (error) {
                    console.error('Error processing image:', error);
                    alert(`Error processing image ${index + 1}. Please try again.`);
                    loadingOverlay.style.display = 'none';
                    generateBtn.classList.remove('loading');
                    generateBtn.disabled = false;
                }
            };
            
            img.onerror = function() {
                console.error('Error loading image:', image.name);
                alert(`Error loading image: ${image.name}. Please try again.`);
                loadingOverlay.style.display = 'none';
                generateBtn.classList.remove('loading');
                generateBtn.disabled = false;
            };
            
            img.src = image.dataUrl;
        }
        
        // Start processing images
        processImage(0);
        
    } catch (error) {
        console.error('Error creating PDF:', error);
        alert('Error creating PDF. Please try again.');
        loadingOverlay.style.display = 'none';
        generateBtn.classList.remove('loading');
        generateBtn.disabled = false;
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

// Camera modal functionality
function openCameraModal() {
    const cameraModal = document.getElementById('cameraModal');
    cameraModal.style.display = 'flex';
    
    // Start camera
    startCamera();
}

function closeCameraModal() {
    const cameraModal = document.getElementById('cameraModal');
    cameraModal.style.display = 'none';
    
    // Stop camera stream
    stopCamera();
    
    // Reset UI
    resetCameraUI();
}

function startCamera() {
    const video = document.getElementById('cameraVideo');
    
    // Check if camera is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Camera is not supported in this browser. Please use a modern browser.');
        return;
    }
    
    // Get camera stream with 9:16 portrait orientation
    const constraints = {
        video: {
            facingMode: facingMode,
            width: { ideal: 720, min: 480 },
            height: { ideal: 1280, min: 960 },
            aspectRatio: { ideal: 0.5625 }, // 9:16 aspect ratio (portrait)
            frameRate: { ideal: 30, min: 15 }
        }
    };
    
    navigator.mediaDevices.getUserMedia(constraints)
    .then(function(stream) {
        cameraStream = stream;
        video.srcObject = stream;
        
        // Set video properties for better mobile experience
        video.setAttribute('playsinline', true);
        video.setAttribute('webkit-playsinline', true);
        video.setAttribute('autoplay', true);
        video.setAttribute('muted', true);
        
        // Wait for video to be ready
        video.onloadedmetadata = function() {
            video.play().catch(function(err) {
                console.error('Error playing video:', err);
            });
        };
    })
    .catch(function(err) {
        console.error('Error accessing camera:', err);
        
        // Try with more basic constraints if the first attempt fails
        if (err.name === 'OverconstrainedError' || err.name === 'ConstraintNotSatisfiedError') {
            console.log('Trying with basic camera constraints...');
            navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: facingMode,
                    width: { ideal: 480 },
                    height: { ideal: 854 },
                    aspectRatio: { ideal: 0.5625 } // 9:16 aspect ratio (portrait)
                }
            })
            .then(function(stream) {
                cameraStream = stream;
                video.srcObject = stream;
                video.setAttribute('playsinline', true);
                video.setAttribute('webkit-playsinline', true);
                video.setAttribute('autoplay', true);
                video.setAttribute('muted', true);
                
                video.onloadedmetadata = function() {
                    video.play().catch(function(err) {
                        console.error('Error playing video:', err);
                    });
                };
            })
            .catch(function(err2) {
                console.error('Error with basic constraints:', err2);
                alert('Unable to access camera. Please check camera permissions and try again.');
                closeCameraModal();
            });
        } else {
            alert('Unable to access camera. Please check camera permissions and try again.');
            closeCameraModal();
        }
    });
}

function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
}

function switchCamera() {
    // Toggle between front and back camera
    facingMode = facingMode === 'environment' ? 'user' : 'environment';
    
    // Restart camera with new facing mode
    stopCamera();
    startCamera();
}

function capturePhoto() {
    const video = document.getElementById('cameraVideo');
    const canvas = document.getElementById('cameraCanvas');
    const captureBtn = document.querySelector('.capture-btn');
    const retakeBtn = document.getElementById('retakeBtn');
    const usePhotoBtn = document.getElementById('usePhotoBtn');

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    
    // Draw the video frame directly without rotation
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Set canvas style to maintain aspect ratio and fit in modal
    const aspectRatio = canvas.width / canvas.height;
    if (aspectRatio < 1) {
        // Portrait image (9:16)
        canvas.style.width = '60vw';
        canvas.style.height = '90vw';
    } else {
        // Landscape image (fallback)
        canvas.style.width = '90vw';
        canvas.style.height = '50vw';
    }

    // Center the canvas
    canvas.style.display = 'block';
    canvas.style.margin = '20px auto';
    canvas.style.background = '#000';
    canvas.style.borderRadius = '12px';
    canvas.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';

    // Hide video
    video.style.display = 'none';

    // Show retake and use photo buttons
    captureBtn.style.display = 'none';
    retakeBtn.style.display = 'inline-block';
    usePhotoBtn.style.display = 'inline-block';
}

function retakePhoto() {
    const video = document.getElementById('cameraVideo');
    const canvas = document.getElementById('cameraCanvas');
    const captureBtn = document.querySelector('.capture-btn');
    const retakeBtn = document.getElementById('retakeBtn');
    const usePhotoBtn = document.getElementById('usePhotoBtn');
    
    // Show video again
    video.style.display = 'block';
    canvas.style.display = 'none';
    
    // Show capture button, hide retake and use photo buttons
    captureBtn.style.display = 'inline-block';
    retakeBtn.style.display = 'none';
    usePhotoBtn.style.display = 'none';
}

function usePhoto() {
    const canvas = document.getElementById('cameraCanvas');
    
    // Convert canvas to data URL
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    
    // Create a file-like object
    const imageData = {
        id: Date.now() + Math.random(),
        name: `camera-photo-${Date.now()}.jpg`,
        size: 0, // Will be calculated
        type: 'image/jpeg',
        dataUrl: imageDataUrl,
        originalDataUrl: imageDataUrl
    };
    
    // Add to images array
    images.push(imageData);
    updateImageDisplay();
    updateImageCount();
    
    // Show images section if hidden
    const imagesSection = document.getElementById('imagesSection');
    if (imagesSection.style.display === 'none') {
        imagesSection.style.display = 'block';
    }
    
    // Close camera modal
    closeCameraModal();
}

function resetCameraUI() {
    const video = document.getElementById('cameraVideo');
    const canvas = document.getElementById('cameraCanvas');
    const captureBtn = document.querySelector('.capture-btn');
    const retakeBtn = document.getElementById('retakeBtn');
    const usePhotoBtn = document.getElementById('usePhotoBtn');
    
    // Reset display
    video.style.display = 'block';
    canvas.style.display = 'none';
    
    // Reset buttons
    captureBtn.style.display = 'inline-block';
    retakeBtn.style.display = 'none';
    usePhotoBtn.style.display = 'none';
} 
