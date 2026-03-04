document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Fungsi Tombol Kembali
    const backButton = document.getElementById('back-button');
    if (backButton) {
        backButton.addEventListener('click', () => {
            // Kembali ke root landing page SPARTA
            window.location.href = '../index.html'; 
            // Alternatif jika ingin ke history sebelumnya:
            // window.history.back();
        });
    }

    // 2. Fungsi Accordion untuk manual section
    const accordions = document.querySelectorAll('.accordion');

    accordions.forEach(accordion => {
        const header = accordion.querySelector('.accordion-header');
        const content = accordion.querySelector('.accordion-content');

        header.addEventListener('click', () => {
            accordions.forEach(acc => {
                if (acc !== accordion && acc.classList.contains('active')) {
                    acc.classList.remove('active');
                    acc.querySelector('.accordion-content').style.maxHeight = null;
                }
            });

            // Toggle active class pada accordion yang diklik
            accordion.classList.toggle('active');

            if (accordion.classList.contains('active')) {
                // Set max-height sesuai dengan tinggi scroll (isi konten)
                content.style.maxHeight = content.scrollHeight + 40 + "px"; // +40px untuk padding kompensasi
            } else {
                content.style.maxHeight = null;
            }
        });
    });
});