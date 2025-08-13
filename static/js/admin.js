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
  wilayahList.innerHTML = '';

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

  for (const doc of slotSnapshot.docs) {
    const slotId = doc.id;
    const wilayahSnap = await db.collection('slot_parkir').doc(slotId).collection('wilayah').get();
    const deviceSnap = await db.collection('slot_parkir').doc(slotId).collection('device').get();

    let namaWilayah = '-', maxMobil = 0, maxMotor = 0, idWilayah = '-';
    if (!wilayahSnap.empty) {
      const wilayahDoc = wilayahSnap.docs[0];
      const data = wilayahDoc.data();
      namaWilayah = data.nama_wilayah || wilayahDoc.id;
      maxMobil = data.max_mobil || 0;
      maxMotor = data.max_motor || 0;
      idWilayah = wilayahDoc.id;
    }

    let countMobil = 0, countMotor = 0, deviceId = '-';
    if (!deviceSnap.empty) {
      const deviceDoc = deviceSnap.docs[0];
      const data = deviceDoc.data();
      countMobil = data.count_mobil || 0;
      countMotor = data.count_motor || 0;
      deviceId = data.device_id || deviceDoc.id;
    }

    // Perbaikan logika status
    const mobilPenuh = countMobil >= maxMobil;
    const motorPenuh = countMotor >= maxMotor;

    let status = 'Tersedia';
    let badgeClass = 'bg-success';

    if (mobilPenuh && motorPenuh) {
      status = 'Penuh';
      badgeClass = 'bg-danger';
    } else if (mobilPenuh && !motorPenuh) {
      status = 'Motor Tersedia';
      badgeClass = 'bg-warning';
    } else if (!mobilPenuh && motorPenuh) {
      status = 'Mobil Tersedia';
      badgeClass = 'bg-warning';
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${index++}</td>
      <td>${slotId}</td>
      <td>${namaWilayah}</td>
      <td>${deviceId}</td>
      <td>${countMobil} / ${maxMobil}</td>
      <td>${countMotor} / ${maxMotor}</td>
      <td>
        <span class="badge ${badgeClass}">${status}</span>
      </td>
      <td>
        <button class="btn btn-sm btn-warning me-1" onclick="editWilayah('${slotId}', '${idWilayah}', '${namaWilayah}')">Edit Wilayah</button>
        <button class="btn btn-sm btn-info me-1" onclick="editDevice('${slotId}', '${deviceId}')">Edit Device</button>
        <button class="btn btn-sm btn-danger" onclick="confirmHapusWilayah('${slotId}', '${idWilayah}')">Hapus</button>
      </td>
    `;
    tbody.appendChild(tr);
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
  if (!newName) return alert('Nama tidak boleh kosong');

  await db.collection('slot_parkir')
    .doc(currentEdit.slotId)
    .collection('wilayah')
    .doc(currentEdit.wilayahId)
    .update({ id_wilayah: newName });

  editWilayahModal.hide();
  loadWilayah();
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
        document.getElementById('edit-mobil').value = data.count_mobil;
        document.getElementById('edit-motor').value = data.count_motor;
        editModal.show();
      }
    });
}

document.getElementById('save-edit-btn').addEventListener('click', async () => {
  const count_mobil = parseInt(document.getElementById('edit-mobil').value) || 0;
  const count_motor = parseInt(document.getElementById('edit-motor').value) || 0;

  await db.collection('slot_parkir')
    .doc(currentEdit.slotId)
    .collection('device')
    .doc(currentEdit.deviceId)
    .update({ count_mobil, count_motor });

  editModal.hide();
  loadWilayah();
});


document.getElementById('resetDeviceBtn').addEventListener('click', async () => {
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
  document.getElementById('hapusModalText').textContent = `Hapus wilayah "${idWilayah}"?`;
  hapusModal.show();
}

document.getElementById('confirmHapusBtn').addEventListener('click', async () => {
  const { slotId, idWilayah } = wilayahToDelete;

  await db.collection('slot_parkir').doc(slotId).collection('wilayah').doc(idWilayah).delete();

  // Optional: delete device subcollection too
  const deviceSnap = await db.collection('slot_parkir').doc(slotId).collection('device').get();
  for (const doc of deviceSnap.docs) {
    await doc.ref.delete();
  }

  await db.collection('slot_parkir').doc(slotId).delete();

  hapusModal.hide();
  loadWilayah();
});


// Buka modal tambah device (tanpa form input)
document.getElementById('openTambahDeviceModal').addEventListener('click', () => {
  loadSlotDropdowndevice(); // Memuat dropdown saat tombol ditekan
  tambahDeviceModal.show();
});

async function loadSlotDropdown() {
  const selectElement = document.getElementById('select-slot-id');
  selectElement.innerHTML = '<option value="">-- Pilih Slot --</option>';

  try {
    const snapshot = await db.collection('slot_parkir').get();
    snapshot.forEach(doc => {
      const opt = document.createElement('option');
      opt.value = doc.id;
      opt.textContent = doc.id; // atau tampilkan nama jika ada field `nama`
      selectElement.appendChild(opt);
    });
  } catch (error) {
    console.error('Gagal memuat slot:', error);
    alert('Gagal memuat daftar slot.');
  }
}

async function loadSlotDropdowndevice() {
  const selectElement = document.getElementById('select-slot-id-device');
  selectElement.innerHTML = '<option value="">-- Pilih Slot --</option>';

  try {
    const snapshot = await db.collection('slot_parkir').get();
    snapshot.forEach(doc => {
      const opt = document.createElement('option');
      opt.value = doc.id;
      opt.textContent = doc.id; // atau tampilkan nama jika ada field `nama`
      selectElement.appendChild(opt);
    });
  } catch (error) {
    console.error('Gagal memuat slot:', error);
    alert('Gagal memuat daftar slot.');
  }
}


// Langsung buat device baru dengan count default 0
document.getElementById('save-device-btn').addEventListener('click', async () => {
  const selectedSlotId = document.getElementById('select-slot-id-device').value; // ID <select> yang menampung slot

  if (!selectedSlotId) return alert('Pilih Slot terlebih dahulu.');

  const deviceId = generateId();

  try {
    await db.collection('slot_parkir')
      .doc(selectedSlotId)
      .collection('device')
      .doc(deviceId)
      .set({
        device_id: deviceId,
        count_mobil: 0,
        count_motor: 0
      });

    tambahDeviceModal.hide();
    alert(`Device berhasil dibuat di slot ${selectedSlotId} dengan ID: ${deviceId}`);
    loadDeviceList();
    loadWilayah();
  } catch (error) {
    console.error("Gagal menambahkan device:", error);
    alert("Terjadi kesalahan saat menambahkan device.");
  }
});

document.getElementById('confirmHapusBtn').addEventListener('click', async () => {
  if (wilayahToDelete) {
    const slotDoc = await db.collection('slot_parkir').doc(wilayahToDelete).get();
    const idWilayah = slotDoc.data().id_wilayah;

    await db.collection('slot_parkir').doc(wilayahToDelete).delete();
    await db.collection('wilayah').doc(idWilayah).delete();

    hapusModal.hide();
    loadWilayah();
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
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${index++}</td>
        <td>${slotId}</td>
        <td>${data.device_id}</td>
        <td>${data.count_mobil}</td>
        <td>${data.count_motor}</td>
        <td>
          <button class="btn btn-sm btn-warning me-1" onclick="openEditDevice('${slotId}', '${data.device_id}', ${data.count_mobil}, ${data.count_motor})">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="confirmHapusDevice('${slotId}', '${data.device_id}')">Hapus</button>
        </td>
      `;
      tbody.appendChild(row);
    }
  }

  deviceListDiv.appendChild(table);
}


// Fungsi buka modal edit
function openEditDevice(slotId, deviceId, mobil, motor) {
  currentEdit.slotId = slotId;
  currentEdit.deviceId = deviceId;
  document.getElementById('edit-device-mobil').value = mobil;
  document.getElementById('edit-device-motor').value = motor;
  modalEditDevice.show();
}

document.getElementById('btnSimpanEditDevice').addEventListener('click', async () => {
  const count_mobil = parseInt(document.getElementById('edit-device-mobil').value) || 0;
  const count_motor = parseInt(document.getElementById('edit-device-motor').value) || 0;

  await db.collection('slot_parkir')
    .doc(currentEdit.slotId)
    .collection('device')
    .doc(currentEdit.deviceId)
    .update({ count_mobil, count_motor });

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
