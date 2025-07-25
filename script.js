window.addEventListener('load', () => {
    let navbar = document.getElementById('navbar');
    let navbarToggle = document.getElementById('navbar-bars');
    if (navbar && navbarToggle) {
        navbarToggle.addEventListener('click', () => {
            navbar.classList.toggle('list-open');
            navbarToggle.classList.toggle('selected');
        });
    } else {
        console.warn("Navbar or Navbar Toggle element not found in DOM.");
    }
});