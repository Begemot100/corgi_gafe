// Open Action Modal
function openActionModal(button) {
    const modal = document.getElementById('action-modal1');

    // Ensure button is an HTML element
    if (!(button instanceof HTMLElement)) {
        console.error("The provided argument is not an HTML element");
        return;
    }

    // Get the position of the ellipsis button
    const rect = button.getBoundingClientRect();

    // Position the modal to the left of the ellipsis button, more left adjustment
    modal.style.top = `${rect.top + window.scrollY}px`;
    modal.style.left = `${rect.left + window.scrollX - modal.offsetWidth - 50}px`; // Adjust further to the left by 50px

    // Display the modal
    modal.style.display = 'block';

    // Prevent click event from propagating to the window click handler (which would close the modal)
    event.stopPropagation();
}


// Close Modal function
function closeActionModal() {
    const modal = document.getElementById('action-modal1');
    modal.style.display = 'none';
}


// Close Action Modal
function closeActionModal() {
    const modal = document.getElementById('action-modal1');
    modal.style.display = 'none';
}

// Close modal when clicking outside of it
window.onclick = function(event) {
    const modal = document.getElementById('action-modal1');
    if (modal.style.display === 'block' && !modal.contains(event.target)) {
        closeActionModal();
    }
};
