//animación de home

const menuOpenButton = document.querySelector("#menu-open-button");
const menuCloseButton = document.querySelector("#menu-close-button");

menuOpenButton.addEventListener("click", ()=>{
    document.body.classList.toggle("show-mobile-menu");
});

menuCloseButton.addEventListener("click", () => menuOpenButton.click());


    const testimonialsList = document.querySelector('.testimonials-list');
    const testimonials = document.querySelectorAll('.testimonial');
    const prevBtn = document.querySelector('.prev');
    const nextBtn = document.querySelector('.next');
    const dotsContainer = document.querySelector('.carousel-dots');

    const itemsPerPage = 3;
    const totalSlides = Math.ceil(testimonials.length / itemsPerPage);
    let currentSlide = 0;

    for (let i = 0; i < totalSlides; i++) {
        const dot = document.createElement('span');
        dot.classList.add('dot');
        if (i === 0) dot.classList.add('active');
        dot.addEventListener('click', () => {
            currentSlide = i;
            updateCarousel();
        });
        dotsContainer.appendChild(dot);
    }

    const dots = document.querySelectorAll('.carousel-dots .dot');

    function updateCarousel() {
        const testimonialWidth = testimonials[0].offsetWidth;
        const gap = 0;

        const offset = currentSlide * testimonialWidth * itemsPerPage + gap * currentSlide;
        testimonialsList.style.transform = `translateX(-${offset}px)`;

        dots.forEach(dot => dot.classList.remove('active'));
        dots[currentSlide].classList.add('active');
    }

    nextBtn.addEventListener('click', () => {
        currentSlide = (currentSlide + 1) % totalSlides;
        updateCarousel();
    });

    prevBtn.addEventListener('click', () => {
        currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
        updateCarousel();
    });

    window.addEventListener('resize', updateCarousel);

    setInterval(() => {
        currentSlide = (currentSlide + 1) % totalSlides;
        updateCarousel();
    }, 10000);
