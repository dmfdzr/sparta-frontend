document.addEventListener('DOMContentLoaded', () => {
    const userEmail = "husni.yulianto@sat.co.id"; 
    const apiUrl = `https://sparta-backend.onrender.com/api/name_by_email?email=${userEmail}`;
    const nameElement = document.getElementById('name');
    const cabangElement = document.getElementById('cabang');

    async function getUserData() {
        try {
            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const data = await response.json();
            if (data.status === 'success') {
                nameElement.textContent = `Halo, ${data.name}`;
                const userCabang = data.cabang || "-"; 
                cabangElement.textContent = userCabang;
            } else {
                nameElement.textContent = "Halo, User";
                console.warn("Status API tidak success:", data);
            }

        } catch (error) {
            console.error("Gagal mengambil data user:", error);
            nameElement.textContent = "Halo, User";
            cabangElement.textContent = "-";
        }
    }
    getUserData();
});