window.addEventListener('load', () => {
    let navbar = document.getElementById('navbar');
    let bars = document.getElementById('navbar-bars');
    let border = document.getElementById('bars-border');

    bars.onclick = () => {
        if (navbar.classList.contains('list-open')){ 
            navbar.classList.remove('list-open');
            bars.classList.remove('selected');
            border.style.borderColor = 'transparent';
        } else {
            navbar.classList.add('list-open');
            bars.classList.add('selected');
            border.style.borderColor = '';
        }
    }
});