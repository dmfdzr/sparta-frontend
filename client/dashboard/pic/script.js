document.addEventListener('DOMContentLoaded', () => {
    // Ambil email dari local storage
    // TIPS: Jika sedang testing manual tanpa login, Anda bisa hardcode email sementara di sini
    // contoh: const userEmail = localStorage.getItem('userEmail') || "email_test@contoh.com";
    const userEmail = localStorage.getItem('userEmail');
    
    console.log("Cek LocalStorage userEmail:", userEmail); // Debugging 1

    if (!userEmail) {
        console.warn("User email tidak ditemukan. Seharusnya redirect ke login.");
        
        // --- SEMENTARA DIMATIKAN UNTUK TESTING API ---
        // alert("Anda belum login atau sesi telah habis.");
        // window.location.replace('../../auth/pic/login.html'); 
        // return; 
        
        // Jika ingin tetap test API walau tanpa login (Hardcode sementara):
        // userEmail = "contoh@alfamart.co.id"; (Hanya jika API mengizinkan)
    }

    const apiUrl = `https://sparta-backend.onrender.com/api/user_info_by_email?email=${userEmail}`;
    
    const nameElement = document.getElementById('name');
    const cabangElement = document.getElementById('cabang');

    async function getUserData() {
        // Cek jika email kosong/null sebelum fetch agar tidak error 400/500
        if (!userEmail) {
            nameElement.textContent = "Error: Email tidak ditemukan";
            cabangElement.textContent = "Silakan Login Ulang";
            return;
        }

        console.log("Mengambil data dari URL:", apiUrl); // Debugging 2

        try {
            const response = await fetch(apiUrl);
            
            // Debugging 3: Cek status response
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            console.log("Data sukses diterima:", data); // Debugging 4

            if (data.status === 'success') { // Pastikan backend me-return key 'status'
                nameElement.textContent = `Halo, ${data.name || "User"}`;
                // Cek variasi nama key dari backend (misal: user_cabang, branch, atau cabang)
                const usercabang = data.cabang ? data.cabang : "-"; 
                cabangElement.textContent = usercabang;
            } else {
                console.warn("User tidak ditemukan di database:", data);
                nameElement.textContent = "Halo, User (Data Kosong)";
                cabangElement.textContent = "-";
            }
        } catch (error) {
            console.error("Gagal mengambil data user (Fetch Error):", error);
            nameElement.textContent = "Halo, User (Gagal Load)";
            cabangElement.textContent = "Cek Koneksi/API";
        }
    }
    
    getUserData();
});