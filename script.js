window.addEventListener('load', () => {
    let navbar = document.getElementById('navbar');
    let navbarToggle = document.getElementById('navbar-toggle');

    navbarToggle.addEventListener('click', () => {
        navbar.classList.toggle('list-open');
        navbarToggle.classList.toggle('selected');
    });
});