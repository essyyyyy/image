// JavaScript to handle the upload and gallery

function uploadImage() {
    const fileInput = document.getElementById('imageUpload');
    const file = fileInput.files[0];
    
    if (!file) {
        alert("Please select an image to upload.");
        return;
    }

    const formData = new FormData();
    formData.append('image', file);

    fetch('/upload', {
        method: 'POST',
        body: formData,
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert("Image uploaded successfully!");
            loadGallery(); // Reload the gallery after upload
        } else {
            alert("Error uploading image.");
        }
    })
    .catch(error => {
        console.error("Error:", error);
        alert("Error uploading image.");
    });
}

function loadGallery() {
    fetch('/gallery')
        .then(response => response.json())
        .then(data => {
            const gallery = document.getElementById('gallery');
            gallery.innerHTML = '';
            data.images.forEach(image => {
                const img = document.createElement('img');
                img.src = image.url;
                img.alt = image.filename;
                img.onclick = () => deleteImage(image.id);
                gallery.appendChild(img);
            });
        });
}

function deleteImage(id) {
    fetch(`/delete/${id}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert("Image deleted successfully!");
            loadGallery(); // Reload the gallery after delete
        } else {
            alert("Error deleting image.");
        }
    })
    .catch(error => {
        console.error("Error:", error);
        alert("Error deleting image.");
    });
}

// Load gallery on page load
window.onload = loadGallery;
