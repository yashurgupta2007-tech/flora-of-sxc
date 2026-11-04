const TREES_TABLE = 'flora_trees';
const ZONES_TABLE = 'campus_zones';

async function fetchTrees(params = {}) {
  let query = supabaseClient.from(TREES_TABLE)
  .select(`*,campus_zones (id, name, slug)`).eq('is_active', true);

  if(params.search) {
    const search = params.search.trim();

    query = query.or(`common_name.ilike.%${search}%,`+
      `botanical_name.ilike.%${search}%,`+
      `family.ilike.%${search}%,`+
      `genus.ilike.%${search}%`
    );
  }

  if (params.zone) {
    query = query.eq('campus_zones.slug', params.zone);
  }

  if (params.featured === true) {
    query = query.eq('featured', true);
  }

  query = query.order('common_name', { ascending: true});
  const { data, error } = await query;
  if (error) {
    console.error('Supabase fetchTrees Error: ',error);
    throw error;
  }
  return {
    data: data || [],
    total: data ? data.length: 0
  };
}

async function fetchTreeById(id) {
  const { data,error } = await supabaseClient.from(TREES_TABLE)
  .select(`*, campus_zones(id, name, slug)`).eq('id',id).eq('is_active',true).single();

  if (error) {
    console.error('Supabase fetchTreeById error: ',error);
    throw error;
  }
  return data;
}

async function fetchZones() {
  const { data,error } = await supabaseClient.from(ZONES_TABLE)
  .select('*').eq('is_active',true).order('display_order', { ascending: true });

  if (error) {
    console.error('Supabase fetchZones error: ',error);
    throw error;
  }

  return data || [];
}

async function createTree(data) {
  const { data: tree,error } = await supabaseClient.from(TREES_TABLE)
  .insert(data).select().single();

  if (error) {
    console.error('Supabase createTree error:',error);
    throw error;
  }

  return tree;
}

async function updateTree(id, data) {
  const { data:tree,error } = await supabaseClient.from(TREES_TABLE)
  .update(data).eq('id',id).select().single();

  if (error) {
    console.error('Supabase updateTree error: ',error);
    throw error;
  }
  return tree;
}

async function deleteTree(id) {
  const { error } = await supabaseClient.from(TREES_TABLE)
  .update({ is_active: false }).eq('id',id);

  if(error) {
    console.error('Supabase deleteTree error: ',error);
    throw error;
  }

  return true;
}

function escapeHTML(str) {
  if(str === null || str === undefined) {
    return '';
  }
  return String(str)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g,'&#39;');
}