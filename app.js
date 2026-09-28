const SUPABASE_URL="https://vehjlratfdsxnhuulaeq.supabase.co";
const SUPABASE_KEY="sb_publishable_pxd281eSJTjqnIqQXyecyw_cndrIiip";
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const $=id=>document.getElementById(id);
const categories=["Chicken","Beef","Pork","Casseroles","Crockpot","Pasta","Mexican","Sides","Desserts","Breakfast","Soups"];
let recipes=[],currentUser=null,activeCategory="",activeTag="",favoritesOnly=false;
let enteringUserId=null;

const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function msg(id,text,ok=false){$(id).textContent=text;$(id).className=ok?"message success":"message"}

async function start(){
  const {data:{session},error}=await sb.auth.getSession();
  if(error){
    msg("authMessage",error.message);
    showAuth();
    return;
  }
  if(session?.user) await enterApp(session.user);
  else showAuth();
}

/*
 IMPORTANT:
 Keep the auth-state callback itself synchronous.
 Database/storage work is scheduled after the callback returns.
*/
sb.auth.onAuthStateChange((event,session)=>{
  if(session?.user){
    const user=session.user;
    setTimeout(()=>{
      if(!currentUser || currentUser.id!==user.id) enterApp(user);
    },0);
  }else if(event==="SIGNED_OUT"){
    setTimeout(()=>showAuth(),0);
  }
});

async function enterApp(user){
  if(enteringUserId===user.id) return;
  enteringUserId=user.id;
  try{
    currentUser=user;
    $("authScreen").hidden=true;
    $("app").hidden=false;
    $("userEmail").textContent=user.email||"";
    msg("authMessage","");
    drawCategories();
    await loadRecipes();
  }catch(err){
    console.error(err);
    $("loadMessage").textContent=err?.message||String(err);
  }finally{
    enteringUserId=null;
  }
}

function showAuth(){
  currentUser=null;
  enteringUserId=null;
  recipes=[];
  $("app").hidden=true;
  $("authScreen").hidden=false;
}

$("signUpBtn").onclick=async()=>{
  const email=$("email").value.trim(),password=$("password").value;
  if(!email||!password)return msg("authMessage","Enter an email and password first.");
  msg("authMessage","Creating your account…");
  const redirectTo=new URL(".",window.location.href).href;
  const {data,error}=await sb.auth.signUp({
    email,
    password,
    options:{emailRedirectTo:redirectTo}
  });
  if(error)return msg("authMessage",error.message);
  if(data.session){
    msg("authMessage","Account created and signed in.",true);
    await enterApp(data.session.user);
  }else{
    msg("authMessage","Account created! Check your email and click the confirmation link. Then return here and sign in.",true);
  }
};

$("signInBtn").onclick=async()=>{
  const email=$("email").value.trim(),password=$("password").value;
  if(!email||!password)return msg("authMessage","Enter your email and password first.");
  $("signInBtn").disabled=true;
  msg("authMessage","Signing in…");
  try{
    const {data,error}=await sb.auth.signInWithPassword({email,password});
    if(error){
      msg("authMessage",error.message);
      return;
    }
    msg("authMessage","");
    if(data?.user) await enterApp(data.user);
  }catch(err){
    msg("authMessage",err?.message||String(err));
  }finally{
    $("signInBtn").disabled=false;
  }
};

$("signOutBtn").onclick=async()=>{
  const {error}=await sb.auth.signOut();
  if(error) alert(error.message);
  else showAuth();
};

function drawCategories(){
  $("categories").innerHTML=`<button class="chip ${!activeCategory?"active":""}" data-category="">All</button>`+
    categories.map(c=>`<button class="chip ${activeCategory===c?"active":""}" data-category="${esc(c)}">${esc(c)}</button>`).join("");
  $("category").innerHTML=categories.map(c=>`<option>${esc(c)}</option>`).join("");
}

async function signedUrl(path){
  if(!path)return"";
  const {data,error}=await sb.storage.from("recipe-files").createSignedUrl(path,3600);
  return error?"":data.signedUrl;
}

async function loadRecipes(){
  $("loadMessage").textContent="Loading your recipes…";
  const {data,error}=await sb.from("recipes").select("*").order("created_at",{ascending:false});
  if(error){
    $("loadMessage").textContent=error.message;
    return;
  }
  recipes=data||[];
  await Promise.all(recipes.map(async r=>r.mainPhotoUrl=await signedUrl(r.main_photo_path)));
  $("loadMessage").textContent="";
  drawTagCloud();
  drawRecipes();
}

function drawTagCloud(){
  const tags=[...new Set(recipes.flatMap(r=>r.tags||[]))].sort((a,b)=>a.localeCompare(b));
  $("tagsSection").hidden=!tags.length;
  $("tagCloud").innerHTML=tags.map(t=>`<button class="chip ${activeTag===t?"active":""}" data-tag="${esc(t)}">${esc(t)}</button>`).join("");
}

function drawRecipes(){
  const q=$("search").value.trim().toLowerCase();
  const list=recipes.filter(r=>{
    const hay=[r.recipe_name,r.category,r.ingredients,r.directions,r.notes,...(r.tags||[])].join(" ").toLowerCase();
    return (!q||hay.includes(q)) &&
      (q||!activeCategory||r.category===activeCategory) &&
      (!activeTag||(r.tags||[]).includes(activeTag)) &&
      (!favoritesOnly||r.favorite);
  });
  $("listTitle").textContent=q?"Search Results":activeTag?`Tag: ${activeTag}`:favoritesOnly?"Favorites":activeCategory||"Recently Added";
  $("recipeCount").textContent=`${list.length} recipe${list.length===1?"":"s"}`;
  $("recipeGrid").innerHTML=list.length?list.map(r=>`<article class="card" data-view="${r.id}">
    <div class="card-photo">${r.mainPhotoUrl?`<img src="${r.mainPhotoUrl}" alt="">`:"🍴"}</div>
    <div class="card-body"><h3>${esc(r.recipe_name)} ${r.favorite?"⭐":""}</h3><div class="meta">${esc(r.category||"")}</div>
    <div>${(r.tags||[]).map(t=>`<button class="tag view-tag" data-tag="${esc(t)}">${esc(t)}</button>`).join("")}</div></div></article>`).join(""):
    `<div class="empty">No matching recipes yet.</div>`;
}

function clearFilters(){
  activeCategory="";
  activeTag="";
  favoritesOnly=false;
  $("search").value="";
  drawCategories();
  drawTagCloud();
}

$("search").oninput=()=>{
  if($("search").value.trim()){
    activeCategory="";
    activeTag="";
    favoritesOnly=false;
    drawCategories();
    drawTagCloud();
  }
  drawRecipes();
};

$("favoritesBtn").onclick=()=>{
  clearFilters();
  favoritesOnly=true;
  drawRecipes();
};

$("randomBtn").onclick=()=>{
  if(!recipes.length)return alert("Add a recipe first!");
  showRecipe(recipes[Math.floor(Math.random()*recipes.length)].id);
};

$("addRecipeBtn").onclick=()=>{
  $("recipeForm").reset();
  $("recipeId").value="";
  $("formTitle").textContent="Add Recipe";
  msg("saveMessage","");
  $("recipeDialog").showModal();
};

$("cancelBtn").onclick=$("cancelTop").onclick=()=>$("recipeDialog").close();
$("closeViewBtn").onclick=()=>$("viewDialog").close();

async function uploadFile(file,kind,recipeId){
  if(!file)return null;
  const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,"_");
  const path=`${currentUser.id}/${recipeId}/${kind}-${Date.now()}-${safe}`;
  const {error}=await sb.storage.from("recipe-files").upload(path,file,{upsert:false});
  if(error)throw error;
  return path;
}

$("recipeForm").onsubmit=async e=>{
  e.preventDefault();
  $("saveBtn").disabled=true;
  msg("saveMessage","Saving to your cloud recipe box…");
  try{
    const id=$("recipeId").value||crypto.randomUUID();
    const old=recipes.find(r=>r.id===id)||{};
    let mainPath=old.main_photo_path||null,filePath=old.recipe_file_path||null;
    if($("mainPhoto").files[0])mainPath=await uploadFile($("mainPhoto").files[0],"main",id);
    if($("recipeFile").files[0])filePath=await uploadFile($("recipeFile").files[0],"source",id);

    const row={
      id,
      user_id:currentUser.id,
      recipe_name:$("recipeName").value.trim(),
      category:$("category").value,
      tags:[...new Set($("tags").value.split(",").map(x=>x.trim()).filter(Boolean))],
      ingredients:$("ingredients").value,
      directions:$("directions").value,
      prep_time:$("prepTime").value,
      cook_time:$("cookTime").value,
      servings:$("servings").value,
      nutrition:$("nutrition").value,
      source_url:$("sourceUrl").value.trim()||null,
      main_photo_path:mainPath,
      recipe_file_path:filePath,
      date_made:$("dateMade").value||null,
      notes:$("notes").value,
      favorite:!!old.favorite
    };

    const {error}=await sb.from("recipes").upsert(row);
    if(error)throw error;

    $("recipeDialog").close();
    clearFilters();
    await loadRecipes();
    await showRecipe(id);
  }catch(err){
    msg("saveMessage",err?.message||String(err));
  }finally{
    $("saveBtn").disabled=false;
  }
};

async function showRecipe(id){
  const r=recipes.find(x=>x.id===id);
  if(!r)return;
  const original=await signedUrl(r.recipe_file_path);
  const isPdf=(r.recipe_file_path||"").toLowerCase().endsWith(".pdf");

  $("recipeView").innerHTML=`<h2>${esc(r.recipe_name)}</h2>
  <div class="view-actions"><button class="favorite" data-favorite="${id}">${r.favorite?"★ Favorite":"☆ Add to Favorites"}</button><button data-edit="${id}">Edit</button></div>
  ${r.mainPhotoUrl?`<img class="recipe-image" src="${r.mainPhotoUrl}" alt="">`:""}
  <p><b>${esc(r.category||"")}</b> ${(r.tags||[]).map(t=>`<button class="tag view-tag" data-tag="${esc(t)}">${esc(t)}</button>`).join("")}</p>
  <p>${r.prep_time?`Prep: ${esc(r.prep_time)} &nbsp;`:""}${r.cook_time?`Cook: ${esc(r.cook_time)} &nbsp;`:""}${r.servings?`Servings: ${esc(r.servings)}`:""}</p>
  ${r.ingredients?`<h3>Ingredients</h3><div class="pre">${esc(r.ingredients)}</div>`:""}
  ${r.directions?`<h3>Directions</h3><div class="pre">${esc(r.directions)}</div>`:""}
  ${original?(isPdf?`<h3>Original Recipe PDF</h3><a class="pdf-link" href="${original}" target="_blank">📄 Open saved PDF</a>`:`<h3>Original Recipe Screenshot</h3><img class="recipe-image" src="${original}" alt="">`):""}
  ${r.source_url?`<p><a href="${esc(r.source_url)}" target="_blank" rel="noopener">🔗 View original webpage</a></p>`:""}
  ${r.nutrition?`<h3>Nutrition</h3><p>${esc(r.nutrition)}</p>`:""}
  ${r.date_made?`<h3>Date Made</h3><p>${esc(r.date_made)}</p>`:""}
  ${r.notes?`<h3>My Notes</h3><div class="pre">${esc(r.notes)}</div>`:""}`;

  $("viewDialog").showModal();
}

document.addEventListener("click",async e=>{
  if(e.target.dataset.category!==undefined){
    activeCategory=e.target.dataset.category;
    activeTag="";
    favoritesOnly=false;
    $("search").value="";
    drawCategories();
    drawTagCloud();
    drawRecipes();
    return;
  }

  if(e.target.dataset.tag!==undefined){
    activeTag=e.target.dataset.tag;
    activeCategory="";
    favoritesOnly=false;
    $("search").value="";
    drawCategories();
    drawTagCloud();
    drawRecipes();
    if($("viewDialog").open)$("viewDialog").close();
    return;
  }

  const card=e.target.closest("[data-view]");
  if(card){
    showRecipe(card.dataset.view);
    return;
  }

  if(e.target.dataset.favorite){
    const r=recipes.find(x=>x.id===e.target.dataset.favorite);
    const {error}=await sb.from("recipes").update({favorite:!r.favorite}).eq("id",r.id);
    if(!error){
      $("viewDialog").close();
      await loadRecipes();
      await showRecipe(r.id);
    }
    return;
  }

  if(e.target.dataset.edit){
    const r=recipes.find(x=>x.id===e.target.dataset.edit);
    $("viewDialog").close();
    $("recipeForm").reset();
    $("recipeId").value=r.id;
    $("formTitle").textContent="Edit Recipe";
    $("recipeName").value=r.recipe_name||"";
    $("category").value=r.category||categories[0];
    $("tags").value=(r.tags||[]).join(", ");
    $("sourceUrl").value=r.source_url||"";
    $("ingredients").value=r.ingredients||"";
    $("directions").value=r.directions||"";
    $("prepTime").value=r.prep_time||"";
    $("cookTime").value=r.cook_time||"";
    $("servings").value=r.servings||"";
    $("nutrition").value=r.nutrition||"";
    $("dateMade").value=r.date_made||"";
    $("notes").value=r.notes||"";
    msg("saveMessage","");
    $("recipeDialog").showModal();
  }
});

start();
