// UI Elements
const wilayahList = document.getElementById('wilayah-list');
const tambahModal = new bootstrap.Modal(document.getElementById('tambahModal'));
const editWilayahModal = new bootstrap.Modal(document.getElementById('editWilayahModal'));
const hapusModal = new bootstrap.Modal(document.getElementById('hapusModal'));
const tambahDeviceModal = new bootstrap.Modal(document.getElementById('tambahDeviceModal'));
const editModal = new bootstrap.Modal(document.getElementById('editModal'));
const deviceListDiv = document.getElementById('device-list');
const modalEditDevice = new bootstrap.Modal(document.getElementById('modalEditDevice'));
const modalHapusDevice = new bootstrap.Modal(document.getElementById('modalHapusDevice'));

let deviceToEdit = '';
let deviceToDelete = '';

let currentEdit = { deviceId: '', wilayahId: '' };
let wilayahToDelete = null;

// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
  auth.signOut().then(() => location.reload());
});

// ID Generator
function generateId(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
}

// Format ID dari nama wilayah
function formatWilayahId(name) {
  return name.trim().toLowerCase().replace(/\s+/g, '_');
}

async function loadWilayah() {
  wilayahList.innerHTML = ''; // pastikan di awal dibersihkan

  const slotSnapshot = await db.collection('slot_parkir').get();

  let table = document.createElement('table');
  table.className = 'table table-bordered table-striped';
  table.innerHTML = `
    <thead class="table-dark">
      <tr>
        <th>NO</th>
        <th>ID Slot</th>
        <th>Nama Wilayah</th>
        <th>ID Device</th>
        <th>Mobil</th>
        <th>Motor</th>
        <th>Status</th>
        <th>Aksi</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  const tbody = table.querySelector('tbody');
  let index = 1;

  for (const slotDoc of slotSnapshot.docs) {
    const slotId = slotDoc.id;
    const wilayahSnap = await db.collection('slot_parkir').doc(slotId).collection('wilayah').get();
    const deviceSnap = await db.collection('slot_parkir').doc(slotId).collection('device').get();

    for (const wilayahDoc of wilayahSnap.docs) {
      const wData = wilayahDoc.data();
      const wilayahId = wilayahDoc.id;

      // Cari device yang sesuai wilayah
      const devices = deviceSnap.docs.filter(d => d.data().wilayah_id === wilayahId);

      if (devices.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${index++}</td>
          <td>${slotId}</td>
          <td>${wData.nama_wilayah}</td>
          <td>-</td>
          <td>0 / ${wData.max_mobil}</td>
          <td>0 / ${wData.max_motor}</td>
          <td><span class="badge bg-success">Tersedia</span></td>
          <td>
            <button class="btn btn-sm btn-warning me-1" onclick="editWilayah('${slotId}', '${wilayahId}', '${wData.nama_wilayah}')">Edit Wilayah</button>
            <button class="btn btn-sm btn-danger" onclick="confirmHapusWilayah('${slotId}', '${wilayahId}')">Hapus</button>
          </td>
        `;
        tbody.appendChild(tr);
      } else {
        devices.forEach(devDoc => {
          const dData = devDoc.data();
          const mobilPenuh = dData.count_mobil >= wData.max_mobil;
          const motorPenuh = dData.count_motor >= wData.max_motor;

          let status = 'Tersedia';
          let badgeClass = 'bg-success';
          if (mobilPenuh && motorPenuh) {
            status = 'Penuh';
            badgeClass = 'bg-danger';
          } else if (mobilPenuh || motorPenuh) {
            status = 'Sebagian Penuh';
            badgeClass = 'bg-warning';
          }

          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${index++}</td>
            <td>${slotId}</td>
            <td>${wData.nama_wilayah}</td>
            <td>${dData.device_id}</td>
            <td>${dData.count_mobil} / ${wData.max_mobil}</td>
            <td>${dData.count_motor} / ${wData.max_motor}</td>
            <td><span class="badge ${badgeClass}">${status}</span></td>
            <td>
              <button class="btn btn-sm btn-warning me-1" onclick="editWilayah('${slotId}', '${wilayahId}', '${wData.nama_wilayah}')">Edit Wilayah</button>
              <button class="btn btn-sm btn-info me-1" onclick="editDevice('${slotId}', '${dData.device_id}')">Edit Device</button>
              <button class="btn btn-sm btn-danger" onclick="confirmHapusWilayah('${slotId}', '${wilayahId}')">Hapus</button>
            </td>
          `;
          tbody.appendChild(tr);
        });
      }
    }
  }

  wilayahList.appendChild(table);
}


  

//tambah slot

document.getElementById('btnSimpanSlot').addEventListener('click', async () => {
  const input = document.getElementById('input-slot-id');
  const slotName = input.value.trim();
  const slotId = formatWilayahId(slotName); // misalnya: ubah jadi 'parkiran_a'

  if (!slotName) return alert('Nama slot tidak boleh kosong.');

  const ref = db.collection('slot_parkir').doc(slotId);
  const doc = await ref.get();

  if (doc.exists) {
    alert('Slot ID ini sudah ada.');
    return;
  }

  await ref.set({ nama: slotName }); // simpan metadata jika mau

  document.getElementById('input-slot-id').value = '';
  const modal = bootstrap.Modal.getInstance(document.getElementById('tambahSlotModal'));
  modal.hide();
  loadSlotDropdown(); // untuk memperbarui pilihan slot di UI lain
  loadSlotDropdowndevice(); // untuk memperbarui pilihan slot di UI lain
});

// Load Slot untuk dropdown wilayah
async function loadSlotDropdown() {
  const selectElement = document.getElementById('select-slot-id');
  selectElement.innerHTML = '<option value="">-- Pilih Slot --</option>';

  try {
    const snapshot = await db.collection('slot_parkir').get();
    snapshot.forEach(doc => {
      const opt = document.createElement('option');
      opt.value = doc.id;
      opt.textContent = doc.id;
      selectElement.appendChild(opt);
    });
  } catch (error) {
    console.error('Gagal memuat slot:', error);
    alert('Gagal memuat daftar slot.');
  }
}



// Tambah Wilayah
document.getElementById('openTambahModal').addEventListener('click', async () => {
  loadSlotDropdown();
  document.getElementById('input-wilayah-name').value = '';
  document.getElementById('input-max-mobil').value = '';
  document.getElementById('input-max-motor').value = '';

  tambahModal.show();
});

document.getElementById('save-wilayah-btn').addEventListener('click', async () => {
  const namaWilayah = document.getElementById('input-wilayah-name').value.trim();
  const maxMobil = parseInt(document.getElementById('input-max-mobil').value);
  const maxMotor = parseInt(document.getElementById('input-max-motor').value);

  if (!namaWilayah || isNaN(maxMobil) || isNaN(maxMotor) || maxMobil < 0 || maxMotor < 0) {
    return alert('Lengkapi semua data dengan benar.');
  }

  const idWilayah = formatWilayahId(namaWilayah); // untuk ID dokumen
  const selectedSlotId = document.getElementById('select-slot-id').value;
  if (!selectedSlotId) return alert('Pilih slot parkir terlebih dahulu.');

  await db.collection('slot_parkir')
    .doc(selectedSlotId)
    .collection('wilayah')
    .doc(idWilayah)
    .set({
      nama_wilayah: namaWilayah, // simpan nama asli
      max_mobil: maxMobil,
      max_motor: maxMotor
    });

  tambahModal.hide();
  loadWilayah();
});


function editWilayah(slotId, wilayahId, namaWilayah) {
  currentEdit.slotId = slotId;
  currentEdit.wilayahId = wilayahId;
  document.getElementById('edit-wilayah-name').value = namaWilayah;
  editWilayahModal.show();
}

document.getElementById('confirmEditWilayahBtn').addEventListener('click', async () => {
  const newName = document.getElementById('edit-wilayah-name').value.trim();
  if (!newName) {
    alert('Nama wilayah tidak boleh kosong');
    return;
  }

  try {
    await db.collection('slot_parkir')
      .doc(currentEdit.slotId)
      .collection('wilayah')
      .doc(currentEdit.wilayahId)
      .update({ nama_wilayah: newName }); // ubah ke nama_wilayah

    editWilayahModal.hide();
    loadWilayah();
  } catch (error) {
    console.error('Gagal update wilayah:', error);
    alert('Terjadi kesalahan saat mengupdate wilayah');
  }
});


function editDevice(slotId, deviceId) {
  currentEdit.slotId = slotId;
  currentEdit.deviceId = deviceId;

  db.collection('slot_parkir')
    .doc(slotId)
    .collection('device')
    .doc(deviceId)
    .get()
    .then(doc => {
      if (doc.exists) {
        const data = doc.data();
        currentEdit.wilayahId = data.wilayah_id || ''; // simpan wilayah_id juga
        document.getElementById('edit-mobil').value = data.count_mobil;
        document.getElementById('edit-motor').value = data.count_motor;
        editModal.show();
      }
    });
}

document.getElementById('save-edit-btn').addEventListener('click', async () => {
  const count_mobil = parseInt(document.getElementById('edit-mobil').value) || 0;
  const count_motor = parseInt(document.getElementById('edit-motor').value) || 0;

  if (!currentEdit.slotId || !currentEdit.deviceId) {
    alert("Data device tidak lengkap.");
    return;
  }

  await db.collection('slot_parkir')
    .doc(currentEdit.slotId)
    .collection('device')
    .doc(currentEdit.deviceId)
    .update({ count_mobil, count_motor });

  editModal.hide();
  loadWilayah();
});

document.getElementById('resetDeviceBtn').addEventListener('click', async () => {
  if (!currentEdit.slotId || !currentEdit.deviceId) {
    alert("Data device tidak lengkap.");
    return;
  }

  await db.collection('slot_parkir')
    .doc(currentEdit.slotId)
    .collection('device')
    .doc(currentEdit.deviceId)
    .update({ count_mobil: 0, count_motor: 0 });

  editModal.hide();
  loadWilayah();
});


async function confirmHapusWilayah(slotId, idWilayah) {
  wilayahToDelete = { slotId, idWilayah };
  document.getElementById('hapusModalText').textContent = `Hapus wilayah "${idWilayah}" beserta devicenya?`;
  hapusModal.show();
}

document.getElementById('confirmHapusBtn').addEventListener('click', async () => {
  const { slotId, idWilayah } = wilayahToDelete;

  // Hapus wilayah
  await db.collection('slot_parkir')
    .doc(slotId)
    .collection('wilayah')
    .doc(idWilayah)
    .delete();

  // Hapus hanya device yang punya wilayah_id ini
  const deviceSnap = await db.collection('slot_parkir')
    .doc(slotId)
    .collection('device')
    .where('wilayah_id', '==', idWilayah)
    .get();

  for (const doc of deviceSnap.docs) {
    await doc.ref.delete();
  }

  hapusModal.hide();
  loadWilayah();
});



// Buka modal tambah device (tanpa form input)
document.getElementById('openTambahDeviceModal').addEventListener('click', () => {
  loadSlotDropdowndevice(); // Memuat dropdown saat tombol ditekan
  tambahDeviceModal.show();
});

// Load Slot untuk dropdown device
async function loadSlotDropdowndevice() {
  const selectElement = document.getElementById('select-slot-id-device');
  selectElement.innerHTML = '<option value="">-- Pilih Slot --</option>';

  try {
    const snapshot = await db.collection('slot_parkir').get();
    snapshot.forEach(doc => {
      const opt = document.createElement('option');
      opt.value = doc.id;
      opt.textContent = doc.id;
      selectElement.appendChild(opt);
    });
  } catch (error) {
    console.error('Gagal memuat slot:', error);
    alert('Gagal memuat daftar slot.');
  }
}

// Saat pilih slot, load wilayah
document.getElementById('select-slot-id-device').addEventListener('change', async (e) => {
  const slotId = e.target.value;
  const wilayahSelect = document.getElementById('select-wilayah-id-device');
  wilayahSelect.innerHTML = '<option value="">-- Pilih Wilayah --</option>';

  if (!slotId) return;

  try {
    const snapshot = await db.collection('slot_parkir').doc(slotId).collection('wilayah').get();
    snapshot.forEach(doc => {
      const opt = document.createElement('option');
      opt.value = doc.id;
      opt.textContent = doc.data().nama_wilayah || doc.id;
      wilayahSelect.appendChild(opt);
    });
  } catch (error) {
    console.error('Gagal memuat wilayah:', error);
    alert('Gagal memuat daftar wilayah.');
  }
});

// Simpan device
document.getElementById('save-device-btn').addEventListener('click', async () => {
  const slotId = document.getElementById('select-slot-id-device').value;
  const wilayahId = document.getElementById('select-wilayah-id-device').value;

  if (!slotId) return alert('Pilih Slot terlebih dahulu.');
  if (!wilayahId) return alert('Pilih Wilayah terlebih dahulu.');

  const deviceId = generateId();

  try {
    await db.collection('slot_parkir').doc(slotId).collection('device').doc(deviceId).set({
      device_id: deviceId,
      wilayah_id: wilayahId, // simpan hubungan device ke wilayah
      count_mobil: 0,
      count_motor: 0
    });

    tambahDeviceModal.hide();
    alert(`Device berhasil dibuat untuk wilayah ${wilayahId} dengan ID: ${deviceId}`);
    loadDeviceList();
    loadWilayah();
  } catch (error) {
    console.error("Gagal menambahkan device:", error);
    alert("Terjadi kesalahan saat menambahkan device.");
  }
});



// Menampilkan daftar device
async function loadDeviceList() {
  deviceListDiv.innerHTML = '';
  const slotSnapshot = await db.collection('slot_parkir').get();

  let table = document.createElement('table');
  table.className = 'table table-bordered table-striped';
  table.innerHTML = `
    <thead class="table-dark">
      <tr>
        <th>No</th>
        <th>ID Slot</th>
        <th>ID Device</th>
        <th>Mobil</th>
        <th>Motor</th>
        <th>Aksi</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  const tbody = table.querySelector('tbody');
  let index = 1;

  for (const slotDoc of slotSnapshot.docs) {
    const slotId = slotDoc.id;
    const devicesSnapshot = await db.collection('slot_parkir').doc(slotId).collection('device').get();

    for (const devDoc of devicesSnapshot.docs) {
      const data = devDoc.data();
      const deviceId = devDoc.id; // ambil ID dokumen device

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${index++}</td>
        <td>${slotId}</td>
        <td>${deviceId}</td>
        <td>${data.count_mobil ?? 0}</td>
        <td>${data.count_motor ?? 0}</td>
        <td>
          <button class="btn btn-sm btn-warning me-1" 
            onclick="openEditDevice('${slotId}', '${deviceId}', ${data.count_mobil ?? 0}, ${data.count_motor ?? 0})">Edit</button>
          <button class="btn btn-sm btn-danger" 
            onclick="confirmHapusDevice('${slotId}', '${deviceId}')">Hapus</button>
        </td>
      `;
      tbody.appendChild(row);
    }
  }

  deviceListDiv.appendChild(table);
}



// Fungsi buka modal edit
function openEditDevice(slotId, deviceId) {
  currentEdit.slotId = slotId;
  currentEdit.deviceId = deviceId;

  db.collection('slot_parkir')
    .doc(slotId)
    .collection('device')
    .doc(deviceId)
    .get()
    .then(doc => {
      if (doc.exists) {
        const data = doc.data();
        currentEdit.wilayahId = data.wilayah_id || ''; // simpan wilayah_id juga
        document.getElementById('edit-mobil-device').value = data.count_mobil;
        document.getElementById('edit-motor-device').value = data.count_motor;
        modalEditDevice.show();
      }
    });
}

document.getElementById('save-edit-device-btn').addEventListener('click', async () => {
  const count_mobil = parseInt(document.getElementById('edit-mobil-device').value) || 0;
  const count_motor = parseInt(document.getElementById('edit-motor-device').value) || 0;

  if (!currentEdit.slotId || !currentEdit.deviceId) {
    alert("Data device tidak lengkap.");
    return;
  }

  await db.collection('slot_parkir')
    .doc(currentEdit.slotId)
    .collection('device')
    .doc(currentEdit.deviceId)
    .update({ count_mobil, count_motor });

  modalEditDevice.hide();
  loadDeviceList();
  loadWilayah();
});

document.getElementById('resetDeviceBtn-device').addEventListener('click', async () => {
  if (!currentEdit.slotId || !currentEdit.deviceId) {
    alert("Data device tidak lengkap.");
    return;
  }

  await db.collection('slot_parkir')
    .doc(currentEdit.slotId)
    .collection('device')
    .doc(currentEdit.deviceId)
    .update({ count_mobil: 0, count_motor: 0 });

  modalEditDevice.hide();
  loadDeviceList();
  loadWilayah();
});



// Konfirmasi hapus device
function confirmHapusDevice(slotId, deviceId) {
  deviceToDelete = { slotId, deviceId };
  document.getElementById('textHapusDevice').textContent = `Yakin ingin menghapus device ${deviceId} di slot ${slotId}?`;
  modalHapusDevice.show();
}

document.getElementById('btnConfirmHapusDevice').addEventListener('click', async () => {
  const { slotId, deviceId } = deviceToDelete;
  await db.collection('slot_parkir').doc(slotId).collection('device').doc(deviceId).delete();
  modalHapusDevice.hide();
  loadDeviceList();
  loadWilayah();
});

function showPage(page, event) {
  const pages = ['wilayah', 'device'];
  pages.forEach(p => {
    const el = document.getElementById(`page-${p}`);
    if (el) el.style.display = 'none';
  });

  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(btn => btn.classList.remove('active'));

  const target = document.getElementById(`page-${page}`);
  if (target) {
    target.style.display = 'block';
    event.target.classList.add('active');
  }
}

auth.onAuthStateChanged(user => {
  if (user) {
    loadWilayah();
    loadDeviceList();
  } else {
    location.href = '/login';
  }
});
