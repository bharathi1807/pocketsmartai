/**
 * PocketSmart AI - Jewelry Styling Planner Page Controller
 */

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("jewelryPlannerForm");
  const errorAlert = document.getElementById("plannerErrorAlert");
  const submitBtn = document.getElementById("submitPlannerBtn");
  const dropzone = document.getElementById("fileDropzone");
  const fileInput = document.getElementById("outfitImageInput");
  const previewContainer = document.getElementById("imagePreviewContainer");
  const previewImg = document.getElementById("imagePreview");
  const removeBtn = document.getElementById("removeImageBtn");

  let selectedFile = null;

  // File dropzone click & drag
  if (dropzone && fileInput) {
    dropzone.addEventListener("click", () => fileInput.click());

    ["dragenter", "dragover"].forEach((eventName) => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropzone.classList.add("dragover");
      });
    });

    ["dragleave", "drop"].forEach((eventName) => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropzone.classList.remove("dragover");
      });
    });

    dropzone.addEventListener("drop", (e) => {
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelect(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) {
        handleFileSelect(e.target.files[0]);
      }
    });
  }

  function handleFileSelect(file) {
    if (!file.type.startsWith("image/")) {
      showError("Please upload a valid image file (JPEG, PNG, or WebP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showError("Image file size exceeds the 5MB limit.");
      return;
    }

    selectedFile = file;
    hideError();

    const reader = new FileReader();
    reader.onload = (e) => {
      previewImg.src = e.target.result;
      previewContainer.style.display = "inline-block";
      dropzone.style.display = "none";
    };
    reader.readAsDataURL(file);
  }

  if (removeBtn) {
    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      selectedFile = null;
      fileInput.value = "";
      previewContainer.style.display = "none";
      dropzone.style.display = "block";
    });
  }

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const budget = parseFloat(document.getElementById("budget").value);
      const occasion = document.getElementById("occasion").value;
      const jewelryType = document.getElementById("jewelryType").value;
      const preferredStyle = document.getElementById("preferredStyle").value;
      const preferredColor = document.getElementById("preferredColor").value.trim();
      const materialPreference = document.getElementById("materialPreference").value;
      const outfitDescription = document.getElementById("outfitDescription").value.trim();

      if (isNaN(budget) || budget <= 0) {
        showError("Please enter a valid jewelry budget.");
        return;
      }

      hideError();
      setLoading(true);

      const formData = new FormData();
      formData.append("budget", budget.toString());
      formData.append("occasion", occasion);
      formData.append("jewelry_type", jewelryType);
      formData.append("preferred_style", preferredStyle);
      formData.append("material_preference", materialPreference);
      if (preferredColor) formData.append("preferred_color", preferredColor);
      if (outfitDescription) formData.append("outfit_description", outfitDescription);
      if (selectedFile) formData.append("image", selectedFile);

      try {
        await ApiService.generateJewelryRecommendation(formData);
        window.location.href = "recommendations.html";
      } catch (err) {
        showError(err.message || "Failed to generate jewelry recommendations. Please try again.");
        setLoading(false);
      }
    });
  }

  function showError(msg) {
    if (errorAlert) {
      errorAlert.textContent = msg;
      errorAlert.style.display = "block";
    }
  }

  function hideError() {
    if (errorAlert) {
      errorAlert.style.display = "none";
    }
  }

  function setLoading(isLoading) {
    if (!submitBtn) return;
    submitBtn.disabled = isLoading;
    submitBtn.innerHTML = isLoading
      ? '<span class="spinner"></span> Stylist Matching Outfit & Gemstones...'
      : 'Curate Jewelry Collection';
  }
});
