
let CURRENT_ADMIN = null;
let ADMIN_TREES_CACHE = [];
window.EDITING_TREE_IMAGES = [];

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('admin-login-form')
    .addEventListener('submit', handleLogin);
 
  document.getElementById('logout-btn')
    .addEventListener('click', logout);

  document.getElementById('tree-form')
    .addEventListener('submit', handleFormSubmit);

  document.getElementById('cancel-edit-btn')
    .addEventListener('click', resetForm);

  document.getElementById('qr-modal-close')
    .addEventListener('click', closeQrModal);

  document.getElementById('qr-modal')
    .addEventListener('click', (e) => {
      if (e.target.id === 'qr-modal') closeQrModal();
    });

  const imageCount = document.getElementById('f-image-count');

  if(imageCount) {
    imageCount.addEventListener('change', function () {
      const newCount = Number(this.value);
      const existingImages = window.EDITING_TREE_IMAGES || [];
      const previousCount = existingImages.length;

      if (newCount < previousCount) {
        const confirmed = confirm(`You have ${previousCount} uploaded photos. \n\n`+
          `Reducing the count to ${newCount} will remove ` + 
          `${previousCount - newCount} photo(s) from this plant.\n\n`+
          `Do you want to continue?`
        );
        if(!confirmed) {
          this.value = String(previousCount);
          return;
        }
        window.EDITING_TREE_IMAGES = existingImages.slice(0, newCount);
      }
      generateGalleryFields(newCount);
    });
    generateGalleryFields(Number(imageCount.value));
  }

  

  restoreSession();
});

async function handleLogin(e) {
  e.preventDefault();

  const email = document.getElementById('admin-email').value.trim();
  const password = document.getElementById('admin-password').value;
  const button = document.getElementById('admin-login-btn');
  const errorBox = document.getElementById('login-error');

  errorBox.textContent = '';
  button.disabled = true;
  button.innerHTML = 'Signing in…';

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    await verifyAdminRole(data.user);
  } catch (error) {
    console.error('Admin login error:', error);
    errorBox.textContent =
      error.message === 'Invalid login credentials'
        ? 'Incorrect email or password.'
        : error.message || 'Sign-in failed. Please try again.';
  } finally {
    button.disabled = false;
    button.innerHTML = 'Sign In';
  }
}

async function restoreSession() {
  const { data, error } = await supabaseClient.auth.getSession();

  if (error) {
    console.error('Session check failed:', error);
    showLogin();
    return;
  }

  if (data.session) {
    await verifyAdminRole(data.session.user);
  } else {
    showLogin();
  }
}

async function verifyAdminRole(user) {
  const errorBox = document.getElementById('login-error');

  try {
    const { data, error } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Role verification error:', error);
      errorBox.textContent =
        'Could not verify your access role. Please try again.';
      return;
    }

    if (!data || !['admin', 'super_admin'].includes(data.role)) {
      await supabaseClient.auth.signOut();
      showLogin();
      errorBox.textContent =
        'Your account is not authorised. Contact the superadmin.';
      return;
    }

    CURRENT_ADMIN = {
      id: user.id,
      email: user.email,
      role: data.role
    };
    const userManagementPanel =
      document.getElementById('user-management-panel');

    if (userManagementPanel) {
      userManagementPanel.style.display =
        data.role === 'super_admin' ? 'block' : 'none';
    }

    document.getElementById('login-card').style.display = 'none';
    document.getElementById('admin-dashboard').classList.add('visible');
    document.getElementById('admin-email-chip').textContent = user.email;

    document.getElementById('admin-avatar').style.display = 'none';

    await loadAdminTreeList();
    if(data.role === 'super_admin') {
      await loadAdminUsers();
    }
  } catch (error) {
    console.error('Access verification failed:', error);
    errorBox.textContent =
      'Unable to verify access. Check your connection and try again.';
  }
}

function showLogin() {
  CURRENT_ADMIN = null;
  document.getElementById('admin-dashboard').classList.remove('visible');
  document.getElementById('login-card').style.display = 'block';
}

async function logout() {
  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    console.error('Sign-out error:', error);
    alert('Could not sign out. Please try again.');
    return;
  }

  showLogin();
  document.getElementById('admin-login-form').reset();
  document.getElementById('login-error').textContent = '';
}


/* ---------------- CRUD ---------------- */
async function loadAdminTreeList() {
  const list = document.getElementById('admin-tree-list');
  list.innerHTML = '<div class="loading-state"><div class="spinner"></div>Loading…</div>';
  try {
    await loadCampusSections();
    const res = await fetchTrees({ limit: 200 });
    ADMIN_TREES_CACHE = res.data || [];
    console.log('ADMIN TREES: ',res.data);
    document.getElementById('tree-count').textContent = ADMIN_TREES_CACHE.length;
    if (!ADMIN_TREES_CACHE.length) {
      list.innerHTML = '<div class="empty-state">No trees added yet. Use the form to add the first one.</div>';
      return;
    }
    list.innerHTML = ADMIN_TREES_CACHE.map(renderAdminRow).join('');
    console.log('LIST HTML: ',list.innerHTML);
    ADMIN_TREES_CACHE.forEach(t => {
      const editBtn = document.getElementById(`edit-${t.id}`);
      const delBtn = document.getElementById(`del-${t.id}`);
      const qrBtn = document.getElementById(`qr-${t.id}`);
      if (editBtn) editBtn.addEventListener('click', () => editTree(t.id));
      if (delBtn) delBtn.addEventListener('click', () => removeTree(t.id));
      if (qrBtn) qrBtn.addEventListener('click', () => showQrModal(t));
    });
  } catch (e) {
    console.error('LOAD ADMIN TREE ERROR: ',e);
    list.innerHTML = '<div class="empty-state">Could not load trees. Please refresh.</div>';
  }
}

async function loadCampusSections() {
  const select = document.getElementById('f-zone_id');

  try {
    const zones = await fetchZones();

    select.innerHTML = '<option value="">Select a campus section</option>';

    zones.forEach(zone => {
      const option = document.createElement('option');
      option.value = zone.id;
      option.textContent = zone.name;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Could not load campus sections:', error);
    select.innerHTML = '<option value="">Could not load sections</option>';
  }
}

function renderAdminRow(t) {
  console.log('RENDERING TREE: ',t);
  const img = t.image_url || 'https://via.placeholder.com/60';
  return `
  <div class="admin-tree-row">
    <img src="${escapeHTML(img)}" alt="${escapeHTML(t.common_name || '')}">
    <div class="info">
      <h4>${escapeHTML(t.common_name || 'Unnamed')}</h4>
      <span>${escapeHTML(t.botanical_name || '')}</span>
    </div>
    <div class="row-actions">
      <button class="icon-btn" id="qr-${t.id}" title="Generate QR"><i class="fa-solid fa-qrcode"></i></button>
      <button class="icon-btn" id="edit-${t.id}" title="Edit"><i class="fa-solid fa-pen"></i></button>
      <button class="icon-btn danger" id="del-${t.id}" title="Delete"><i class="fa-solid fa-trash"></i></button>
    </div>
  </div>`;
}

function generateGalleryFields(count) {
  const container = document.getElementById('gallery-image-fields');

  if (!container) {
    console.error('gallery-image-fields not found');
    return;
  }

  const existingImages = window.EDITING_TREE_IMAGES || [];
  container.innerHTML = '';

  for (let i = 1; i <= count; i++) {
    const item = document.createElement('div');

    item.className = 'gallery-image-item';
    const existingImage = existingImages[i - 1];

    item.innerHTML = `
      <div style="
        margin-top: 16px;
        padding: 14px;
        border: 1px solid #dce7dd;
        border-radius: 12px;
      ">

        <strong>Image ${i}</strong>

        <div style="margin-top: 10px;">
          <label for="gallery-image-${i}">
            Choose Photo ${i}
          </label>

          <input
            type="file"
            id="gallery-image-${i}"
            class="gallery-image-input"
            accept="image/jpeg,image/png,image/webp"
          >

          <small>
            JPG, PNG or WebP; maximum 5 MB.
          </small>
        </div>

        <div style="margin-top: 10px;">
          <label for="gallery-caption-${i}">
            Photo Caption
          </label>

          <input
            type="text"
            id="gallery-caption-${i}"
            class="gallery-caption-input"
            maxlength="40"
            placeholder="e.g. Inflorescence"
          >
        </div>
        ${existingImage?.image_url ? `
          <div style="margin-top: 12px;">
          <img src="${escapeHTML(existingImage.image_url)}" alt="Existing photo ${i}"
          style="display: block; width: 180px; height: 140px; object-fit: cover; border-radius: 10px; border: 1px solid #dce7dd;">
          <small style="color: #1f6b3c;">Existing photo - select a new file to replace it. </small>
          </div>` : ''
        }
      </div>
    `;

    container.appendChild(item);
    const captionInput = item.querySelector('.gallery-caption-input');
    if (captionInput && existingImage) {
      captionInput.value = existingImage.caption || '';
    }
  }
}


function fieldMap() {
  return {
    common_name: 'f-common_name',
    botanical_name: 'f-botanical_name',
    plant_type: 'f-plant_type',
    zone_id: 'f-zone_id',
    reason_common_name: 'f-reason_common_name',
    scientific_name_meaning: 'f-scientific_name_meaning',
    morphology: 'f-morphology',
    morphology_reason: 'f-morphology_reason',
    traditional_uses: 'f-traditional_uses',
    interesting_facts: 'f-interesting_facts',
    story: 'f-story'
  };
}


async function handleFormSubmit(e) {
  e.preventDefault();

  const id = document.getElementById('tree-id').value;
  const submitBtn = document.querySelector('#tree-form button[type="submit"]');

  const imageInputs = [
    ...document.querySelectorAll('.gallery-image-input')
  ];

  const captionInputs = [
    ...document.querySelectorAll('.gallery-caption-input')
  ];

  const existingImages = window.EDITING_TREE_IMAGES || [];

  const data = {};

  for (const [key, elementId] of Object.entries(fieldMap())) {
    const element = document.getElementById(elementId);
    if (!element) continue;

    data[key] = element.value.trim();
    if (data[key] === '') data[key] = null;
  }

  if (!data.common_name || !data.botanical_name) {
    alert('Please enter both the common name and botanical name.');
    return;
  }

  if (!data.zone_id || !data.plant_type) {
    alert('Please select the plant type and campus location.');
    return;
  }

  const selectedImages = [];

  for (let i = 0; i < imageInputs.length; i++) {
    const file = imageInputs[i].files[0];
    const caption = captionInputs[i]?.value.trim() || '';

    if (file) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        alert(`Image ${i + 1} must be JPG, PNG, or WebP.`);
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert(`Image ${i + 1} exceeds the 5 MB limit.`);
        return;
      }

      selectedImages.push({
        file,
        caption,
        display_order: i + 1
      });
    } else if (id && existingImages[i]) {
      selectedImages.push({
        image_url: existingImages[i].image_url,
        caption,
        display_order: i + 1
      });
    } else if (!id && i === 0) {
      alert('Please choose at least the main photo (Image 1).');
      return;
    }
  }

  if (!id && selectedImages.length === 0) {
    alert('Please choose at least one photo.');
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';
  }

  try {
    const uploadedImages = [];

    for (const item of selectedImages) {
      let imageUrl = item.image_url;

      if (item.file) {
        const extension = item.file.name.split('.').pop().toLowerCase();
        const filePath = `trees/${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await supabaseClient
          .storage
          .from('tree-images')
          .upload(filePath, item.file, {
            contentType: item.file.type,
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data: publicData } = supabaseClient
          .storage
          .from('tree-images')
          .getPublicUrl(filePath);

        imageUrl = publicData.publicUrl;
      }

      if (imageUrl) {
        uploadedImages.push({
          image_url: imageUrl,
          caption: item.caption || null,
          display_order: item.display_order
        });
      }
    }

    if (!uploadedImages.length) {
      throw new Error('Please choose at least one photo.');
    }


    data.image_url = uploadedImages[0].image_url;

    let savedTree;

    if (id) {
      const { data: updatedTree, error } = await supabaseClient
        .from('flora_trees')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      savedTree = updatedTree;
    } else {
      const { data: newTree, error } = await supabaseClient
        .from('flora_trees')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      savedTree = newTree;
    }

    // Replace the gallery rows for this tree.
    const { error: deleteError } = await supabaseClient
      .from('tree_images')
      .delete()
      .eq('tree_id', savedTree.id);

    if (deleteError) throw deleteError;

    const galleryRows = uploadedImages.map(image => ({
      tree_id: savedTree.id,
      image_url: image.image_url,
      caption: image.caption,
      display_order: image.display_order
    }));

    const { error: galleryError } = await supabaseClient
      .from('tree_images')
      .insert(galleryRows);

    if (galleryError) throw galleryError;

    window.EDITING_TREE_IMAGES = [];

    alert(id ? 'Plant updated successfully!' : 'Plant added successfully!');

    resetForm();

    if (typeof loadAdminTrees === 'function') {
      await loadAdminTrees();
    } else if (typeof fetchAdminTrees === 'function') {
      await fetchAdminTrees();
    }
  } catch (error) {
    console.error('Error saving plant:', error);
    alert(`Could not save the plant: ${error.message || error}`);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save Plant';
    }
  }
}



async function editTree(id) {
  try {
    const tree = ADMIN_TREES_CACHE.find(t => t.id === id);

    if (!tree) {
      alert('Plant not found.');
      return;
    }

    const { data: galleryImages, error } = await supabaseClient
      .from('tree_images')
      .select('image_url, caption, display_order')
      .eq('tree_id', id)
      .order('display_order', { ascending: true });

    if (error) throw error;

    window.EDITING_TREE_IMAGES = galleryImages || [];

 
    document.getElementById('tree-id').value = id;

 
    for (const [key, elementId] of Object.entries(fieldMap())) {
      const element = document.getElementById(elementId);

      if (!element) continue;

      element.value = tree[key] ?? '';
    }

  

    const imageCount = document.getElementById('f-image-count');

    if (imageCount) {

      let existingCount = window.EDITING_TREE_IMAGES.length;

      
      if (existingCount === 0 && tree.image_url) {
        window.EDITING_TREE_IMAGES = [{
          image_url: tree.image_url,
          caption: '',
          display_order: 1
        }];

        existingCount = 1;
      }

      
      existingCount = Math.max(1, Math.min(existingCount, 5));

      
      imageCount.value = String(existingCount);

    
      generateGalleryFields(existingCount);

    
      window.EDITING_TREE_IMAGES.forEach((image, index) => {

        const number = index + 1;

        
        const captionInput =
          document.getElementById(`gallery-caption-${number}`);

        if (captionInput) {
          captionInput.value = image.caption || '';
        }

        const imageInput =
          document.getElementById(`gallery-image-${number}`);

        if (imageInput && image.image_url) {

          const preview = document.createElement('div');

          preview.style.marginTop = '10px';

          preview.innerHTML = `
            <img
              src="${escapeHTML(image.image_url)}"
              alt="Existing photo ${number}"
              style="
                display:block;
                width:180px;
                max-height:140px;
                object-fit:cover;
                border-radius:10px;
                border:1px solid #dce7dd;
              "
            >

            <small
              style="
                display:block;
                margin-top:6px;
                color:#1f6b3c;
              "
            >
              Existing photo — choose a new file only if you want to replace it.
            </small>
          `;

          imageInput.insertAdjacentElement('afterend', preview);
        }
      });
    }

    const submitBtn =
      document.querySelector('#tree-form button[type="submit"]');

    if (submitBtn) {
      submitBtn.textContent = 'Update Plant';
    }

    const cancelBtn =
      document.getElementById('cancel-edit-btn');

    if (cancelBtn) {
      cancelBtn.style.display = 'inline-flex';
    }


    document.getElementById('tree-form')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });

  } catch (error) {
    console.error('Error loading plant:', error);

    alert(
      `Could not load the plant: ${error.message || error}`
    );
  }
}


async function removeTree(id) {
  const t = ADMIN_TREES_CACHE.find(x => x.id === id);
  if (!confirm(`Delete "${t ? t.common_name : 'this tree'}"? This cannot be undone.`)) return;
  try {
    await deleteTree(id);
    loadAdminTreeList();
  } catch (e) {
    alert('Failed to delete tree. Please try again.');
  }
}


function showQrModal(t) {
  const wrap = document.getElementById('qr-modal-canvas-wrap');
  wrap.innerHTML = '';
  document.getElementById('qr-modal-title').textContent = `QR — ${t.common_name || 'Tree'}`;
  const url = window.location.origin + window.location.pathname.replace('admin.html', 'tree.html') + '?id=' + encodeURIComponent(t.id);
  new QRCode(wrap, {
    text: url, width: 200, height: 200,
    colorDark: '#0f3d24', colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.H
  });
  document.getElementById('qr-modal').classList.add('open');
  document.getElementById('qr-modal-download').onclick = () => {
    const canvas = wrap.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `QR-${(t.common_name || 'tree').replace(/\s+/g, '-')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };
}

function closeQrModal() {
  document.getElementById('qr-modal').classList.remove('open');
}


async function loadAdminUsers() {
  const list = document.getElementById('admin-user-list');

  if (!list) return;

  list.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            Loading users…
        </div>
    `;

  try {
    const { data, error } = await supabaseClient
      .from('admin_users')
      .select('id, email, role, created_at')
      .order('created_at', { ascending: true });

    if (error) throw error;

    if (!data || data.length === 0) {
      list.innerHTML = `
                <div class="empty-state">No administrators found.</div>
            `;
      return;
    }

    list.innerHTML = data.map(user => `
            <div class="admin-user-row">
                <div class="admin-user-info">
                    <div class="admin-user-email">
                        ${escapeHTML(user.email)}
                    </div>

                    <span class="admin-user-role ${user.role === 'super_admin' ? 'super' : ''}">
                        ${user.role === 'super_admin' ? 'Superadmin' : 'Admin'}
                    </span>
                </div>

                <div class="admin-user-actions">
                    <button
                        type="button"
                        class="btn btn-secondary btn-sm"
                        onclick="editAdminUser('${user.id}')">
                        <i class="fa-solid fa-pen-to-square"></i>
                        Edit
                    </button>
                    ${user.role !== 'super_admin' ? `
                      <button
                        type="button"
                        class="btn btn-sm"
                        style="background:#b42318;color:#fff;border:none;"
                        onclick="deleteAdminUser('${user.id}','${escapeHTML(user.email)}')">
                        <i class="fa-solid fa-trash"></i>
                        Delete
                      </button>`: ''}
                </div>
            </div>
        `).join('');

  } catch (error) {
    console.error('Could not load admin users:', error);

    list.innerHTML = `
            <div class="empty-state">
                Could not load users. Please refresh.
            </div>
        `;
  }
}


document.getElementById('user-management-form')?.addEventListener('submit', async (event) => {
  event.preventDefault();

  const emailInput = document.getElementById('new-user-email');
  const passwordInput = document.getElementById('new-user-password');
  const roleInput = document.getElementById('new-user-role');
  const message = document.getElementById('user-form-msg');
  const button = document.getElementById('create-user-btn');

  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const role = roleInput.value;

  message.textContent = '';
  button.disabled = true;
  button.textContent = 'Creating user…';

  try {
    const { data, error } = await supabaseClient.functions.invoke(
      'create-admin-user',
      {
        body: { email, password, role }
      }
    );

    if (error) {
      let details = error.message;

      try {
        const response = await error.context.json();
        if (response.error) details = response.error;
      } catch (_) { }

      throw new Error(details);
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    message.textContent = `Successfully created ${email} as ${role === 'super_admin' ? 'Superadmin' : 'Admin'}.`;
    message.style.color = '#1f6b3c';

    document.getElementById('user-management-form').reset();
    await loadAdminUsers();

  } catch (error) {
    console.error('Create user failed:', error);
    message.textContent = error.message || 'Could not create user.';
    message.style.color = '#b42318';
  } finally {
    button.disabled = false;
    button.innerHTML = '<i class="fa-solid fa-user-plus"></i> Create User';
  }
});


function editAdminUser(userId) {
  const rows = document.querySelectorAll('.admin-user-row');

  let selectedUser = null;

  rows.forEach(row => {
    const button = row.querySelector('button[onclick]');
    if (!button) return;

    if (button.getAttribute('onclick') === `editAdminUser('${userId}')`) {
      const email = row.querySelector('.admin-user-email')?.textContent.trim();
      const roleElement = row.querySelector('.admin-user-role');

      const isSuperAdmin = roleElement?.textContent.trim() === 'Superadmin';

      selectedUser = {
        id: userId,
        email,
        role: isSuperAdmin ? 'super_admin' : 'admin'
      };
    }
  });

  if (!selectedUser) {
    alert('Could not find this administrator. Please refresh the page.');
    return;
  }

  document.getElementById('edit-user-id').value = selectedUser.id;
  document.getElementById('edit-user-email').value = selectedUser.email;
  document.getElementById('edit-user-password').value = '';
  document.getElementById('edit-user-role').value = selectedUser.role;
  document.getElementById('edit-user-msg').textContent = '';

  document.getElementById('edit-user-modal').style.display = 'flex';
}

function closeEditAdminUser() {
  document.getElementById('edit-user-modal').style.display = 'none';
}


document.getElementById('edit-user-form')?.addEventListener('submit', async (event) => {
  console.log('EDIT USER FORM SUBMITTED');

  event.preventDefault();

  const userId = document.getElementById('edit-user-id').value;
  const email = document.getElementById('edit-user-email').value.trim();
  const password = document.getElementById('edit-user-password').value;
  const role = document.getElementById('edit-user-role').value;
  const message = document.getElementById('edit-user-msg');
  const button = document.getElementById('save-edit-user-btn');

  message.textContent = '';
  button.disabled = true;
  button.textContent = 'Saving…';

  try {
    const { data, error } = await supabaseClient.functions.invoke(
      'update-admin-user',
      {
        body: {
          userId,
          email,
          password,
          role
        }
      }
    );

    if (error) {
      let details = error.message;

      try {
        const response = await error.context.json();
        if (response.error) details = response.error;
      } catch (_) { }

      throw new Error(details);
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    message.style.color = '#1f6b3c';
    message.textContent = 'Administrator updated successfully!';

    document.getElementById('edit-user-password').value = '';

    await loadAdminUsers();

    setTimeout(() => {
      closeEditAdminUser();
    }, 1000);

  } catch (error) {
    console.error('Update administrator failed:', error);
    message.style.color = '#b42318';
    message.textContent = error.message || 'Could not update administrator.';
  } finally {
    button.disabled = false;
    button.textContent = 'Save Changes';
  }
});

async function deleteAdminUser(userId, email) {
  if(!CURRENT_ADMIN || CURRENT_ADMIN.role !== 'super_admin') {
    alert('Only the Superadmin can delete administrators');
    return;
  }

  if(userId === CURRENT_ADMIN.id) {
    alert('You cannot delete your own account.');
    return;
  }

  const confirmed = confirm(
    `Delete administrator "${email}"?\n\n` + 
    `This will permanently delete their account and remove their access. `+
    `This action cannot be undone.`
  );

  if(!confirmed) return;

  try {
    const { data, error } = await supabaseClient.functions.invoke('delete-admin-user',
      {
        body: {userId}
      }
    );
    if (error) {
      let details = error.message;
      try {
        const response = await error.context.json();
        if (response.error) details = response.error;
      } catch (_) {}

      throw new Error(details);
    }
    if (data?.error) {
      throw new Error(data.error);
    }
    alert('Administrator deleted successfully.');
    await loadAdminUsers();
  } catch (error) {
    console.error('Delete Administrator failed: ',error);
    alert(error.message || 'Could not delete this administrator.');
  }
}

function resetForm() {
  const form = document.getElementById('tree-form');
  if (form) {
    form.reset();
  }


  const treeId = document.getElementById('tree-id');
  if (treeId) {
    treeId.value = '';
  }

  window.EDITING_TREE_IMAGES = [];


  const imageCount = document.getElementById('f-image-count');

  if (imageCount) {
    generateGalleryFields(Number(imageCount.value));
  }

  const submitBtn = document.querySelector(
    '#tree-form button[type="submit"]'
  );

  if (submitBtn) {
    submitBtn.textContent = 'Save Plant';
  }

  const cancelBtn = document.getElementById('cancel-edit-btn');

  if (cancelBtn) {
    cancelBtn.style.display = 'none';
  }
}