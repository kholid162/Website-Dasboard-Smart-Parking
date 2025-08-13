const wilayahList = document.getElementById('wilayah-list-public');
const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');
const lastUpdated = document.getElementById('lastUpdated');

async function loadWilayahpublic() {
  const snapshot = await db.collection('slot_parkir').get();
  const fragment = document.createDocumentFragment();

  const now = new Date();
  lastUpdated.textContent = now.toLocaleTimeString();

  for (const doc of snapshot.docs) {
    const slotId = doc.id;
    const wilayahSnap = await db.collection('slot_parkir').doc(slotId).collection('wilayah').get();
    const deviceSnap = await db.collection('slot_parkir').doc(slotId).collection('device').get();

    const data = wilayahSnap.docs[0]?.data() || {};
    const devData = deviceSnap.docs[0]?.data() || {};

    const namaWilayah = data.nama_wilayah || slotId;
    const maxMobil = data.max_mobil || 0;
    const maxMotor = data.max_motor || 0;
    const countMobil = devData.count_mobil || 0;
    const countMotor = devData.count_motor || 0;

    let status = 'Tersedia';
    let badgeClass = 'bg-success';
    if (countMobil >= maxMobil && countMotor >= maxMotor) {
      status = 'Penuh';
      badgeClass = 'bg-danger';
    } else if (countMobil >= maxMobil) {
      status = 'Motor Tersedia';
      badgeClass = 'bg-warning';
    } else if (countMotor >= maxMotor) {
      status = 'Mobil Tersedia';
      badgeClass = 'bg-warning';
    }

    // Filter
    const keyword = searchInput.value.toLowerCase();
    const filterVal = statusFilter.value;
    const cocokNama = namaWilayah.toLowerCase().includes(keyword);
    const cocokStatus = filterVal === 'all' || 
      (filterVal === 'penuh' && status === 'Penuh') ||
      (filterVal === 'tersedia' && status !== 'Penuh');

    if (!cocokNama || !cocokStatus) continue;

    const col = document.createElement('div');
    col.className = 'col-md-6 col-lg-4';

    col.innerHTML = `
      <div class="card h-100 p-3">
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <h5 class="card-title">${namaWilayah}</h5>
            <p class="mb-1">Mobil: ${countMobil} / ${maxMobil}</p>
            <p class="mb-1">Motor: ${countMotor} / ${maxMotor}</p>
            <span class="badge ${badgeClass}">${status}</span>
          </div>
          <div>
          <lottie-player src="/static/icon.json"
          background="transparent" speed="1" loop autoplay>
          </lottie-player>
          </div>
        </div>
        <div class="card-footer text-end">ID: ${slotId}</div>
      </div>`;

    fragment.appendChild(col);
  }

  wilayahList.innerHTML = '';
  wilayahList.appendChild(fragment);
}

document.addEventListener('DOMContentLoaded', () => {
  loadWilayahpublic();
  setInterval(loadWilayahpublic, 5000);
  searchInput.addEventListener('input', loadWilayahpublic);
  statusFilter.addEventListener('change', loadWilayahpublic);
});