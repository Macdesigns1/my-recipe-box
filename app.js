const SUPABASE_URL="https://vehjlratfdsxnhuulaeq.supabase.co";
const SUPABASE_KEY="sb_publishable_pxd281eSJTjqnIqQXyecyw_cndrIiip";
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const $=id=>document.getElementById(id);
const builtInCategories=["Chicken","Beef","Pork","Casseroles","Crockpot","Pasta","Mexican","Sides","Desserts","Breakfast","Soups"];
let customCategories=[],recipes=[],groceryItems=[],mealPlan=[],familyMemberships=[],familyRecipes=[],activeFamily=null,familyCategory="",familyTag="",currentUser=null,activeCategory="",activeTag="",favoritesOnly=false,enteringUserId=null,pickerRecipeId=null,plannerWeekStart=null;
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const allCategoryNames=()=>[...builtInCategories,...customCategories.map(c=>c.name)].sort((a,b)=>a.localeCompare(b));
const grocerySections=[
  "Produce","Meat & Seafood","Dairy & Eggs","Bakery","Frozen",
  "Canned & Jarred","Pantry & Baking","Condiments & Sauces",
  "Snacks & Drinks","Household & Other"
];
const grocerySectionMeta={
  "Produce":"🥬","Meat & Seafood":"🥩","Dairy & Eggs":"🥛","Bakery":"🍞",
  "Frozen":"🧊","Canned & Jarred":"🥫","Pantry & Baking":"🧂",
  "Condiments & Sauces":"🥫","Snacks & Drinks":"🥤","Household & Other":"🧻"
};
function smartGrocerySection(text){
  const s=String(text||"").toLowerCase();
  const has=(...words)=>words.some(w=>s.includes(w));

  if(has("lettuce","tomato","tomatoes","onion","onions","garlic","avocado","avocados","cucumber","cucumbers","pepper","peppers","potato","potatoes","carrot","carrots","celery","spinach","broccoli","cauliflower","mushroom","mushrooms","zucchini","squash","cabbage","lemon","lemons","lime","limes","apple","apples","banana","bananas","berries","strawberry","strawberries","blueberry","blueberries","cilantro","parsley","basil","green onion","scallion","jalapeno","jalapeño","corn on the cob","fresh corn")) return "Produce";
  if(has("chicken","beef","ground beef","steak","pork","bacon","sausage","turkey","ham","shrimp","salmon","tilapia","fish","tuna steak","crab","lobster","meatball","meatballs")) return "Meat & Seafood";
  if(has("milk","cream","half and half","half-and-half","butter","egg","eggs","cheese","cheddar","mozzarella","parmesan","ricotta","sour cream","yogurt","cottage cheese","heavy cream","whipping cream")) return "Dairy & Eggs";
  if(has("bread","rolls","buns","bagel","bagels","croissant","croissants","tortilla","tortillas","pita","naan","english muffin")) return "Bakery";
  if(has("frozen","ice cream","french fries","tater tots","frozen pizza","frozen vegetables","frozen fruit")) return "Frozen";
  if(has("canned","can of","diced tomatoes","tomato paste","tomato sauce","beans","black beans","kidney beans","chickpeas","broth","stock","soup","rotel","green chiles","olives")) return "Canned & Jarred";
  if(has("ketchup","mustard","mayonnaise","mayo","barbecue sauce","bbq sauce","hot sauce","soy sauce","worcestershire","salad dressing","ranch","salsa","taco sauce","teriyaki","marinara","pasta sauce","honey","maple syrup","jam","jelly")) return "Condiments & Sauces";
  if(has("chips","crackers","cookies","goldfish","popcorn","pretzel","pretzels","soda","pepsi","coke","gatorade","juice","coffee","tea","chocolate bar","candy")) return "Snacks & Drinks";
  if(has("toilet paper","paper towel","paper towels","trash bag","trash bags","dish soap","laundry","detergent","cleaner","foil","plastic wrap","ziplock","ziploc","cat food","dog food","litter")) return "Household & Other";
  if(has("flour","sugar","brown sugar","powdered sugar","salt","seasoning","spice","peppercorn","cinnamon","paprika","cumin","oregano","thyme","rosemary","garlic powder","onion powder","baking powder","baking soda","yeast","oil","olive oil","vegetable oil","rice","pasta","noodles","oats","cereal","breadcrumbs","bread crumbs","cornstarch","vanilla","chocolate chips","cocoa","peanut butter","nuts","pecans","walnuts")) return "Pantry & Baking";
  return "Household & Other";
}
function msg(id,text,ok=false){$(id).textContent=text;$(id).className=ok?"message success":"message"}

async function start(){const {data:{session},error}=await sb.auth.getSession();if(error){msg("authMessage",error.message);showAuth();return}if(session?.user)await enterApp(session.user);else showAuth()}
sb.auth.onAuthStateChange((event,session)=>{
  if(event==="PASSWORD_RECOVERY"){
    setTimeout(()=>{
      $("authScreen").hidden=true;
      $("app").hidden=true;
      msg("resetPasswordMessage","");
      $("resetPasswordForm").reset();
      $("resetPasswordDialog").showModal();
    },0);
    return;
  }
  if(session?.user){const user=session.user;setTimeout(()=>{if(!currentUser||currentUser.id!==user.id)enterApp(user)},0)}
  else if(event==="SIGNED_OUT")setTimeout(()=>showAuth(),0)
});
async function enterApp(user){if(enteringUserId===user.id)return;enteringUserId=user.id;try{currentUser=user;$("authScreen").hidden=true;$("app").hidden=false;$("userEmail").textContent=user.email||"";msg("authMessage","");await loadCategories();await loadRecipes();await loadGroceryItems();await loadFamilyMemberships()}catch(err){console.error(err);$("loadMessage").textContent=err?.message||String(err)}finally{enteringUserId=null}}
function showAuth(){currentUser=null;enteringUserId=null;recipes=[];customCategories=[];groceryItems=[];mealPlan=[];familyMemberships=[];familyRecipes=[];activeFamily=null;$("app").hidden=true;$("authScreen").hidden=false}

$("signUpBtn").onclick=async()=>{const email=$("email").value.trim(),password=$("password").value;if(!email||!password)return msg("authMessage","Enter an email and password first.");msg("authMessage","Creating your account…");const redirectTo=new URL(".",window.location.href).href;const {data,error}=await sb.auth.signUp({email,password,options:{emailRedirectTo:redirectTo}});if(error)return msg("authMessage",error.message);if(data.session){msg("authMessage","Account created and signed in.",true);await enterApp(data.session.user)}else msg("authMessage","Account created! Check your email and click the confirmation link. Then return here and sign in.",true)};
$("signInBtn").onclick=async()=>{const email=$("email").value.trim(),password=$("password").value;if(!email||!password)return msg("authMessage","Enter your email and password first.");$("signInBtn").disabled=true;msg("authMessage","Signing in…");try{const {data,error}=await sb.auth.signInWithPassword({email,password});if(error){msg("authMessage",error.message);return}msg("authMessage","");if(data?.user)await enterApp(data.user)}catch(err){msg("authMessage",err?.message||String(err))}finally{$("signInBtn").disabled=false}};
$("signOutBtn").onclick=async()=>{const {error}=await sb.auth.signOut();if(error)alert(error.message);else showAuth()};

$("forgotPasswordBtn").onclick=async()=>{
  const email=$("email").value.trim();
  if(!email)return msg("authMessage","Enter your email address above first, then tap Forgot Password.");
  $("forgotPasswordBtn").disabled=true;
  msg("authMessage","Sending password reset email…");
  const redirectTo=new URL(".",window.location.href).href;
  const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo});
  $("forgotPasswordBtn").disabled=false;
  if(error)return msg("authMessage",error.message);
  msg("authMessage","Password reset email sent. Open the link in that email to choose a new password.",true);
};
$("resetPasswordForm").onsubmit=async e=>{
  e.preventDefault();
  const password=$("newPassword").value,confirmPassword=$("confirmPassword").value;
  if(password.length<6)return msg("resetPasswordMessage","Password must be at least 6 characters.");
  if(password!==confirmPassword)return msg("resetPasswordMessage","The passwords do not match.");
  $("saveNewPasswordBtn").disabled=true;
  msg("resetPasswordMessage","Saving new password…");
  const {error}=await sb.auth.updateUser({password});
  $("saveNewPasswordBtn").disabled=false;
  if(error)return msg("resetPasswordMessage",error.message);
  msg("resetPasswordMessage","Password updated!",true);
  setTimeout(async()=>{$("resetPasswordDialog").close();const {data:{user}}=await sb.auth.getUser();if(user)await enterApp(user)},500);
};


async function loadCategories(){
  const {data,error}=await sb.from("categories").select("id,name,created_at").order("name",{ascending:true});
  if(error)throw error;
  customCategories=data||[];
  drawCategories();
}
function drawCategories(){
  const built=`<button class="chip ${!activeCategory?"active":""}" data-category="">All</button>`+
    builtInCategories.map(c=>`<button class="chip ${activeCategory===c?"active":""}" data-category="${esc(c)}">${esc(c)}</button>`).join("");
  const custom=customCategories.map(c=>`<span class="custom-chip"><button class="chip ${activeCategory===c.name?"active":""}" data-category="${esc(c.name)}">${esc(c.name)}</button><button class="delete-category" title="Delete custom category" data-delete-category="${c.id}" data-delete-name="${esc(c.name)}">×</button></span>`).join("");
  $("categories").innerHTML=built+custom;
  const current=$("category")?.value;
  $("category").innerHTML=allCategoryNames().map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join("");
  if(current&&allCategoryNames().includes(current))$("category").value=current;
}

$("addCategoryBtn").onclick=()=>{$("categoryForm").reset();msg("categoryMessage","");$("categoryDialog").showModal();setTimeout(()=>$("categoryName").focus(),50)};
$("cancelCategoryBtn").onclick=$("cancelCategoryTop").onclick=()=>$("categoryDialog").close();
$("categoryForm").onsubmit=async e=>{
  e.preventDefault();
  const name=$("categoryName").value.trim().replace(/\s+/g," ");
  if(!name)return;
  const duplicate=allCategoryNames().some(c=>c.toLowerCase()===name.toLowerCase());
  if(duplicate)return msg("categoryMessage","That category already exists.");
  $("saveCategoryBtn").disabled=true;msg("categoryMessage","Adding category…");
  const {error}=await sb.from("categories").insert({user_id:currentUser.id,name});
  if(error){msg("categoryMessage",error.message);$("saveCategoryBtn").disabled=false;return}
  await loadCategories();$("categoryDialog").close();$("saveCategoryBtn").disabled=false;
};


async function loadGroceryItems(){
  const {data,error}=await sb.from("grocery_items").select("*").order("created_at",{ascending:true});
  if(error){console.error(error);return}
  groceryItems=data||[];
  const legacy=groceryItems.filter(x=>!x.grocery_section||x.grocery_section==="Other");
  if(legacy.length){
    await Promise.all(legacy.map(x=>sb.from("grocery_items").update({grocery_section:smartGrocerySection(x.item_text)}).eq("id",x.id)));
    groceryItems=groceryItems.map(x=>legacy.some(y=>y.id===x.id)?{...x,grocery_section:smartGrocerySection(x.item_text)}:x);
  }
  drawGroceryList();
  updateGroceryBadge();
}
function updateGroceryBadge(){
  const remaining=groceryItems.filter(x=>!x.checked).length;
  $("groceryBadge").textContent=remaining?String(remaining):"";
}
function drawGroceryList(){
  const remaining=groceryItems.filter(x=>!x.checked).length;
  $("grocerySummary").textContent=`${remaining} item${remaining===1?"":"s"} left • ${groceryItems.length} total`;
  $("clearCheckedBtn").disabled=!groceryItems.some(x=>x.checked);

  if(!groceryItems.length){
    $("groceryList").innerHTML=`<div class="grocery-empty">Your grocery list is empty.<br>Add ingredients from a recipe or type an item above.</div>`;
    return;
  }

  const grouped={};
  grocerySections.forEach(section=>grouped[section]=[]);
  groceryItems.forEach(item=>{
    const section=grocerySections.includes(item.grocery_section)?item.grocery_section:smartGrocerySection(item.item_text);
    (grouped[section]||grouped["Household & Other"]).push(item);
  });

  $("groceryList").innerHTML=grocerySections.filter(section=>grouped[section].length).map(section=>`
    <section class="grocery-section">
      <h3 class="grocery-section-title">${grocerySectionMeta[section]} ${section}
        <span class="grocery-section-count">${grouped[section].length}</span>
      </h3>
      ${grouped[section].map(item=>`
        <div class="grocery-row" data-grocery-row="${item.id}">
          <input type="checkbox" data-grocery-check="${item.id}" ${item.checked?"checked":""} aria-label="Check off ${esc(item.item_text)}">
          <div class="grocery-item-controls">
            <div class="grocery-item-text ${item.checked?"checked":""}">
              ${esc(item.item_text)}
              ${item.recipe_name?`<span class="grocery-source">From: ${esc(item.recipe_name)}</span>`:""}
            </div>
            <select class="grocery-section-select" data-grocery-section="${item.id}" aria-label="Grocery section for ${esc(item.item_text)}">
              ${grocerySections.map(s=>`<option value="${esc(s)}" ${s===section?"selected":""}>${grocerySectionMeta[s]} ${esc(s)}</option>`).join("")}
            </select>
          </div>
          <button type="button" class="delete-grocery" data-grocery-delete="${item.id}" title="Remove item">×</button>
        </div>`).join("")}
    </section>`).join("");
}


function makeFamilyCode(){const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789",a=new Uint32Array(10);crypto.getRandomValues(a);return [...a].map(n=>chars[n%chars.length]).join("")}
async function loadFamilyMemberships(){
  if(!currentUser){familyMemberships=[];activeFamily=null;return}
  const {data,error}=await sb.from("family_members").select("*, family_groups(*)").eq("user_id",currentUser.id);
  if(error){console.error("Family memberships:",error);familyMemberships=[];return}
  familyMemberships=(data||[]).filter(x=>x.family_groups);
  if(activeFamily&&!familyMemberships.some(x=>x.family_id===activeFamily.id))activeFamily=null;
  if(!activeFamily&&familyMemberships.length)activeFamily=familyMemberships[0].family_groups;
}
async function openFamilyArea(){
  await loadFamilyMemberships();
  if(!familyMemberships.length){msg("familySetupMessage","");$("familySetupDialog").showModal();return}
  activeFamily=activeFamily||familyMemberships[0].family_groups;
  await loadFamilyRecipes();$("familyRecipesDialog").showModal();
}
async function createFamily(){
  const name=$("familyNameInput").value.trim(),display=$("familyOwnerNameInput").value.trim();
  if(!name||!display)return msg("familySetupMessage","Enter a family name and your display name.");
  $("createFamilyBtn").disabled=true;msg("familySetupMessage","Creating family…");
  try{
    let group=null,lastError=null;
    for(let i=0;i<4;i++){
      const res=await sb.from("family_groups").insert({name,join_code:makeFamilyCode(),created_by:currentUser.id}).select().single();
      if(!res.error){group=res.data;break} lastError=res.error;
    }
    if(!group)throw lastError||new Error("Could not create family.");
    const {error}=await sb.from("family_members").insert({family_id:group.id,user_id:currentUser.id,display_name:display,role:"owner"});
    if(error)throw error;
    activeFamily=group;await loadFamilyMemberships();$("familySetupDialog").close();await loadFamilyRecipes();$("familyRecipesDialog").showModal();
  }catch(e){msg("familySetupMessage",e.message||String(e))}
  finally{$("createFamilyBtn").disabled=false}
}
async function joinFamily(){
  const code=$("familyCodeInput").value.trim().toUpperCase(),display=$("familyJoinNameInput").value.trim();
  if(!code||!display)return msg("familySetupMessage","Enter the family code and your display name.");
  $("joinFamilyBtn").disabled=true;msg("familySetupMessage","Joining family…");
  try{
    const {data:familyId,error}=await sb.rpc("join_family_by_code",{entered_code:code,member_display_name:display});
    if(error)throw error;
    await loadFamilyMemberships();
    activeFamily=familyMemberships.find(x=>x.family_id===familyId)?.family_groups||familyMemberships[0]?.family_groups;
    if(!activeFamily)throw new Error("Family joined. Please close and reopen the app.");
    $("familySetupDialog").close();await loadFamilyRecipes();$("familyRecipesDialog").showModal();
  }catch(e){msg("familySetupMessage",e.message||String(e))}
  finally{$("joinFamilyBtn").disabled=false}
}
async function loadFamilyRecipes(){
  if(!activeFamily)return;
  const {data,error}=await sb.from("family_recipes").select("*").eq("family_id",activeFamily.id).order("created_at",{ascending:false});
  if(error){msg("familyRecipesMessage",error.message);return}
  familyRecipes=data||[];
  await Promise.all(familyRecipes.map(async r=>{
    r.mainPhotoUrl=null;
    if(r.main_photo_path){
      const {data}=await sb.storage.from("recipe-files").createSignedUrl(r.main_photo_path,3600);
      r.mainPhotoUrl=data?.signedUrl||null;
    }
  }));
  drawFamilyRecipes();
}
function drawFamilyRecipes(){
  if(!activeFamily)return;
  $("familyRecipesTitle").textContent=`❤️ ${activeFamily.name}`;
  $("familyCodeDisplay").innerHTML=`Family code: <b class="family-code-box">${esc(activeFamily.join_code)}</b>`;
  const q=$("familySearch").value.trim().toLowerCase();
  const list=familyRecipes.filter(r=>(!familyCategory||r.category===familyCategory)&&(!familyTag||(r.tags||[]).includes(familyTag))&&(!q||[r.recipe_name,r.category,r.ingredients,r.directions,r.notes,r.shared_by_name,...(r.tags||[])].join(" ").toLowerCase().includes(q)));
  const cats=[...new Set(familyRecipes.map(r=>r.category).filter(Boolean))].sort();
  $("familyCategoryButtons").innerHTML=`<button data-family-category="" class="${!familyCategory?"active":""}">All</button>`+cats.map(c=>`<button data-family-category="${esc(c)}" class="${familyCategory===c?"active":""}">${esc(c)}</button>`).join("");
  const tags=[...new Set(familyRecipes.flatMap(r=>r.tags||[]))].sort();
  $("familyTagButtons").innerHTML=tags.map(t=>`<button class="tag ${familyTag===t?"active":""}" data-family-tag="${esc(t)}">#${esc(t)}</button>`).join("");
  $("familyEmpty").hidden=!!list.length;
  $("familyRecipeGrid").innerHTML=list.map(r=>`<article class="recipe-card" data-family-open="${r.id}">${r.mainPhotoUrl?`<img src="${r.mainPhotoUrl}" alt="" loading="lazy">`:""}<div class="recipe-card-body"><h3>${esc(r.recipe_name)}</h3><div class="family-card-owner">Shared by ${esc(r.shared_by_name||"Family")}</div></div></article>`).join("");
}
async function shareRecipeToFamily(id){
  await loadFamilyMemberships();
  if(!familyMemberships.length){$("familySetupDialog").showModal();return}
  activeFamily=activeFamily||familyMemberships[0].family_groups;
  const r=recipes.find(x=>x.id===id),m=familyMemberships.find(x=>x.family_id===activeFamily.id);if(!r)return;
  const row={family_id:activeFamily.id,shared_by:currentUser.id,shared_by_name:m?.display_name||currentUser.email?.split("@")[0]||"Family",source_recipe_id:r.id,recipe_name:r.recipe_name,category:r.category,tags:r.tags||[],ingredients:r.ingredients,directions:r.directions,prep_time:r.prep_time,cook_time:r.cook_time,servings:r.servings,nutrition:r.nutrition,source_url:r.source_url,main_photo_path:r.main_photo_path,date_made:r.date_made,notes:r.notes};
  const {error}=await sb.from("family_recipes").upsert(row,{onConflict:"family_id,shared_by,source_recipe_id"});
  if(error)return alert(error.message);
  alert(`Added "${r.recipe_name}" to ${activeFamily.name}. ❤️`);
}
async function showFamilyRecipe(id){
  const r=familyRecipes.find(x=>x.id===id);if(!r)return;const mine=r.shared_by===currentUser.id;
  $("familyRecipeView").innerHTML=`<button class="secondary" data-close-family-view>← Family Recipes</button><h2>${esc(r.recipe_name)}</h2><div class="family-card-owner">Shared by ${esc(r.shared_by_name||"Family")}</div>${r.mainPhotoUrl?`<img class="recipe-image" src="${r.mainPhotoUrl}" alt="">`:""}<p><b>${esc(r.category||"")}</b></p>${r.ingredients?`<h3>Ingredients</h3><div class="preserve">${esc(r.ingredients)}</div>`:""}${r.directions?`<h3>Directions</h3><div class="preserve">${esc(r.directions)}</div>`:""}${r.notes?`<h3>Notes</h3><div class="preserve">${esc(r.notes)}</div>`:""}<div class="family-view-actions"><button data-print-family="${r.id}">🖨️ Print</button><button data-save-family="${r.id}">Save to My Recipes</button>${mine?`<button class="danger" data-remove-family="${r.id}">Remove from Family</button>`:""}</div>`;
  $("familyRecipesDialog").close();$("familyRecipeViewDialog").showModal();
}
async function saveFamilyRecipeToMine(id){
  const r=familyRecipes.find(x=>x.id===id);if(!r)return;
  const {error}=await sb.from("recipes").insert({id:crypto.randomUUID(),user_id:currentUser.id,recipe_name:r.recipe_name,category:r.category,tags:r.tags||[],ingredients:r.ingredients,directions:r.directions,prep_time:r.prep_time,cook_time:r.cook_time,servings:r.servings,nutrition:r.nutrition,source_url:r.source_url,notes:r.notes,favorite:false});
  if(error)return alert(error.message);await loadRecipes();alert(`Saved "${r.recipe_name}" to My Recipes.`);
}
async function removeFamilyRecipe(id){
  const r=familyRecipes.find(x=>x.id===id);if(!r||!confirm(`Remove "${r.recipe_name}" from Family Recipes?\n\nYour personal recipe will stay in My Recipes.`))return;
  const {error}=await sb.from("family_recipes").delete().eq("id",id);if(error)return alert(error.message);
  $("familyRecipeViewDialog").close();await loadFamilyRecipes();$("familyRecipesDialog").showModal();
}
$("familyBtn").onclick=openFamilyArea;
$("closeFamilySetupBtn").onclick=()=>$("familySetupDialog").close();
$("closeFamilyRecipesBtn").onclick=()=>$("familyRecipesDialog").close();
$("createFamilyBtn").onclick=createFamily;
$("joinFamilyBtn").onclick=joinFamily;
$("familySearch").oninput=drawFamilyRecipes;
$("copyFamilyCodeBtn").onclick=async()=>{await navigator.clipboard.writeText(activeFamily.join_code);msg("familyRecipesMessage","Family code copied!",true)};
$("familyCategoryButtons").onclick=e=>{if(e.target.dataset.familyCategory!==undefined){familyCategory=e.target.dataset.familyCategory;drawFamilyRecipes()}};
$("familyTagButtons").onclick=e=>{if(e.target.dataset.familyTag!==undefined){familyTag=familyTag===e.target.dataset.familyTag?"":e.target.dataset.familyTag;drawFamilyRecipes()}};
$("familyRecipeGrid").onclick=e=>{const c=e.target.closest("[data-family-open]");if(c)showFamilyRecipe(c.dataset.familyOpen)};
$("familyRecipeView").onclick=async e=>{if(e.target.hasAttribute("data-close-family-view")){$("familyRecipeViewDialog").close();$("familyRecipesDialog").showModal();return}if(e.target.dataset.printFamily){printRecipe(e.target.dataset.printFamily,"family");return}if(e.target.dataset.saveFamily){await saveFamilyRecipeToMine(e.target.dataset.saveFamily);return}if(e.target.dataset.removeFamily){await removeFamilyRecipe(e.target.dataset.removeFamily);return}};

function localISODate(d){
  const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}
function sundayOfWeek(d=new Date()){
  const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());
  x.setDate(x.getDate()-x.getDay());
  return x;
}
function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x}
function prettyDate(d){return d.toLocaleDateString(undefined,{month:"short",day:"numeric"})}
function mealForDate(dateStr){return mealPlan.find(x=>x.meal_date===dateStr)}
async function loadMealPlanForWeek(){
  if(!currentUser||!plannerWeekStart)return;
  const start=localISODate(plannerWeekStart),end=localISODate(addDays(plannerWeekStart,6));
  const {data,error}=await sb.from("meal_plan").select("*").gte("meal_date",start).lte("meal_date",end).order("meal_date");
  if(error){msg("mealPlannerMessage",error.message);return}
  mealPlan=data||[];
  drawMealPlanner();
}
function drawMealPlanner(){
  if(!plannerWeekStart)return;
  const end=addDays(plannerWeekStart,6);
  $("mealWeekLabel").textContent=`${prettyDate(plannerWeekStart)} – ${prettyDate(end)}, ${end.getFullYear()}`;
  const today=localISODate(new Date());
  const days=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const sorted=[...recipes].sort((a,b)=>a.recipe_name.localeCompare(b.recipe_name));
  $("mealPlannerGrid").innerHTML=days.map((day,i)=>{
    const d=addDays(plannerWeekStart,i),dateStr=localISODate(d),planned=mealForDate(dateStr);
    return `<div class="meal-day ${dateStr===today?"today":""}">
      <div class="meal-day-name">${day}</div>
      <div class="meal-day-date">${prettyDate(d)}</div>
      <select class="meal-select" data-meal-date="${dateStr}" aria-label="Recipe for ${day}">
        <option value="">Choose a recipe…</option>
        ${sorted.map(r=>`<option value="${r.id}" ${planned?.recipe_id===r.id?"selected":""}>${esc(r.recipe_name)}</option>`).join("")}
      </select>
      ${planned?`<button type="button" class="secondary meal-open" data-open-meal-recipe="${planned.recipe_id}">Open Recipe</button>
      <button type="button" class="meal-remove" data-remove-meal="${dateStr}">Remove</button>`:""}
    </div>`;
  }).join("");
}
async function saveMealDay(dateStr,recipeId){
  msg("mealPlannerMessage","");
  if(!recipeId){
    const {error}=await sb.from("meal_plan").delete().eq("meal_date",dateStr);
    if(error)return msg("mealPlannerMessage",error.message);
    await loadMealPlanForWeek();return;
  }
  const r=recipes.find(x=>x.id===recipeId); if(!r)return;
  const {error}=await sb.from("meal_plan").upsert(
    {user_id:currentUser.id,meal_date:dateStr,recipe_id:r.id,recipe_name:r.recipe_name},
    {onConflict:"user_id,meal_date"}
  );
  if(error)return msg("mealPlannerMessage",error.message);
  await loadMealPlanForWeek();
}
async function openMealPlanner(){
  plannerWeekStart=sundayOfWeek(new Date());
  msg("mealPlannerMessage","");
  $("mealPlannerDialog").showModal();
  await loadMealPlanForWeek();
}
async function addPlannedWeekToGrocery(){
  const planned=mealPlan.filter(x=>x.recipe_id);
  if(!planned.length)return msg("mealPlannerMessage","Choose at least one recipe for the week first.");
  const recipeMap=new Map(recipes.map(r=>[r.id,r]));
  const payload=[];
  for(const p of planned){
    const r=recipeMap.get(p.recipe_id);
    if(!r?.ingredients)continue;
    const lines=r.ingredients.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
    for(const text of lines){
      payload.push({user_id:currentUser.id,item_text:text,recipe_id:r.id,recipe_name:r.recipe_name,grocery_section:smartGrocerySection(text)});
    }
  }
  if(!payload.length)return msg("mealPlannerMessage","The planned recipes don't have ingredients to add.");
  const {error}=await sb.from("grocery_items").insert(payload);
  if(error)return msg("mealPlannerMessage",error.message);
  await loadGroceryItems();
  msg("mealPlannerMessage",`Added ${payload.length} ingredient${payload.length===1?"":"s"} to your grocery list.`);
}

$("mealPlannerBtn").onclick=openMealPlanner;
$("closeMealPlannerBtn").onclick=()=>$("mealPlannerDialog").close();
$("prevWeekBtn").onclick=async()=>{plannerWeekStart=addDays(plannerWeekStart,-7);await loadMealPlanForWeek()};
$("thisWeekBtn").onclick=async()=>{plannerWeekStart=sundayOfWeek(new Date());await loadMealPlanForWeek()};
$("nextWeekBtn").onclick=async()=>{plannerWeekStart=addDays(plannerWeekStart,7);await loadMealPlanForWeek()};
$("addWeekGroceryBtn").onclick=addPlannedWeekToGrocery;

$("mealPlannerGrid").addEventListener("change",async e=>{
  if(e.target.dataset.mealDate)await saveMealDay(e.target.dataset.mealDate,e.target.value);
});
$("mealPlannerGrid").addEventListener("click",async e=>{
  if(e.target.dataset.removeMeal)await saveMealDay(e.target.dataset.removeMeal,"");
  if(e.target.dataset.openMealRecipe){
    const r=recipes.find(x=>x.id===e.target.dataset.openMealRecipe);
    if(r){$("mealPlannerDialog").close();await openView(r)}
  }
});

$("groceryBtn").onclick=async()=>{await loadGroceryItems();$("groceryDialog").showModal()};
$("closeGroceryBtn").onclick=()=>$("groceryDialog").close();

$("manualGroceryForm").onsubmit=async e=>{
  e.preventDefault();
  const text=$("manualGroceryItem").value.trim();
  if(!text)return;
  const {error}=await sb.from("grocery_items").insert({user_id:currentUser.id,item_text:text,grocery_section:smartGrocerySection(text)});
  if(error)return msg("groceryMessage",error.message);
  $("manualGroceryItem").value="";
  msg("groceryMessage","");
  await loadGroceryItems();
};

$("clearCheckedBtn").onclick=async()=>{
  const checked=groceryItems.filter(x=>x.checked);
  if(!checked.length)return;
  if(!confirm(`Remove ${checked.length} checked item${checked.length===1?"":"s"} from your grocery list?`))return;
  const ids=checked.map(x=>x.id);
  const {error}=await sb.from("grocery_items").delete().in("id",ids);
  if(error)return msg("groceryMessage",error.message);
  await loadGroceryItems();
};

function openIngredientPicker(recipeId){
  const r=recipes.find(x=>x.id===recipeId);
  if(!r)return;
  const lines=String(r.ingredients||"").split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  if(!lines.length){alert("This recipe doesn't have ingredient text yet.");return}
  pickerRecipeId=recipeId;
  $("ingredientPickerRecipe").textContent=r.recipe_name;
  $("ingredientPickerList").innerHTML=lines.map((line,i)=>`
    <label class="ingredient-pick-row">
      <input type="checkbox" class="ingredient-pick-check" checked>
      <input type="text" class="ingredient-pick-text" value="${esc(line)}" aria-label="Ingredient ${i+1}">
    </label>`).join("");
  msg("ingredientPickerMessage","");
  $("ingredientPickerDialog").showModal();
}
$("closeIngredientPicker").onclick=$("cancelIngredientPicker").onclick=()=>$("ingredientPickerDialog").close();
$("selectAllIngredients").onclick=()=>document.querySelectorAll(".ingredient-pick-check").forEach(x=>x.checked=true);
$("selectNoIngredients").onclick=()=>document.querySelectorAll(".ingredient-pick-check").forEach(x=>x.checked=false);
$("addSelectedIngredients").onclick=async()=>{
  const r=recipes.find(x=>x.id===pickerRecipeId);
  if(!r)return;
  const rows=[...document.querySelectorAll(".ingredient-pick-row")];
  const selected=rows.filter(row=>row.querySelector(".ingredient-pick-check").checked).map(row=>row.querySelector(".ingredient-pick-text").value.trim()).filter(Boolean);
  if(!selected.length)return msg("ingredientPickerMessage","Select at least one ingredient.");
  $("addSelectedIngredients").disabled=true;
  msg("ingredientPickerMessage","Adding to your grocery list…");
  const payload=selected.map(text=>({user_id:currentUser.id,item_text:text,recipe_id:r.id,recipe_name:r.recipe_name,grocery_section:smartGrocerySection(text)}));
  const {error}=await sb.from("grocery_items").insert(payload);
  $("addSelectedIngredients").disabled=false;
  if(error)return msg("ingredientPickerMessage",error.message);
  await loadGroceryItems();
  $("ingredientPickerDialog").close();
  $("viewDialog").close();
  $("groceryDialog").showModal();
};

async function signedUrl(path){if(!path)return"";const {data,error}=await sb.storage.from("recipe-files").createSignedUrl(path,3600);return error?"":data.signedUrl}
async function loadRecipes(){$("loadMessage").textContent="Loading your recipes…";const {data,error}=await sb.from("recipes").select("*").order("created_at",{ascending:false});if(error){$("loadMessage").textContent=error.message;return}recipes=data||[];await Promise.all(recipes.map(async r=>r.mainPhotoUrl=await signedUrl(r.main_photo_path)));$("loadMessage").textContent="";drawTagCloud();drawRecipes()}
function drawTagCloud(){const tags=[...new Set(recipes.flatMap(r=>r.tags||[]))].sort((a,b)=>a.localeCompare(b));$("tagsSection").hidden=!tags.length;$("tagCloud").innerHTML=tags.map(t=>`<button class="chip ${activeTag===t?"active":""}" data-tag="${esc(t)}">${esc(t)}</button>`).join("")}
function drawRecipes(){const q=$("search").value.trim().toLowerCase();const list=recipes.filter(r=>{const hay=[r.recipe_name,r.category,r.ingredients,r.directions,r.notes,...(r.tags||[])].join(" ").toLowerCase();return(!q||hay.includes(q))&&(q||!activeCategory||r.category===activeCategory)&&(!activeTag||(r.tags||[]).includes(activeTag))&&(!favoritesOnly||r.favorite)});$("listTitle").textContent=q?"Search Results":activeTag?`Tag: ${activeTag}`:favoritesOnly?"Favorites":activeCategory||"Recently Added";$("recipeCount").textContent=`${list.length} recipe${list.length===1?"":"s"}`;$("recipeGrid").innerHTML=list.length?list.map(r=>`<article class="card" data-view="${r.id}"><div class="card-photo">${r.mainPhotoUrl?`<img src="${r.mainPhotoUrl}" alt="">`:"🍴"}</div><div class="card-body"><h3>${esc(r.recipe_name)} ${r.favorite?"⭐":""}</h3><div class="meta">${esc(r.category||"")}</div><div>${(r.tags||[]).map(t=>`<button class="tag view-tag" data-tag="${esc(t)}">${esc(t)}</button>`).join("")}</div></div></article>`).join(""):`<div class="empty">No matching recipes yet.</div>`}
function clearFilters(){activeCategory="";activeTag="";favoritesOnly=false;$("search").value="";drawCategories();drawTagCloud()}
$("search").oninput=()=>{if($("search").value.trim()){activeCategory="";activeTag="";favoritesOnly=false;drawCategories();drawTagCloud()}drawRecipes()};
$("favoritesBtn").onclick=()=>{clearFilters();favoritesOnly=true;drawRecipes()};
$("randomBtn").onclick=()=>{if(!recipes.length)return alert("Add a recipe first!");showRecipe(recipes[Math.floor(Math.random()*recipes.length)].id)};

$("addRecipeBtn").onclick=()=>{$("recipeForm").reset();drawCategories();$("recipeId").value="";$("formTitle").textContent="Add Recipe";$("deleteRecipeBtn").hidden=true;msg("saveMessage","");msg("extractMessage","");$("recipeDialog").showModal()};
$("cancelBtn").onclick=$("cancelTop").onclick=()=>$("recipeDialog").close();$("closeViewBtn").onclick=()=>$("viewDialog").close();

function fileToBase64(file){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(String(reader.result).split(",")[1]||"");
    reader.onerror=()=>reject(new Error("I couldn't read that image file."));
    reader.readAsDataURL(file);
  });
}

$("extractIngredientsBtn").onclick=async()=>{
  const file=$("recipeFile").files[0];
  if(!file)return msg("extractMessage","Choose a recipe screenshot first.");
  if(!file.type.startsWith("image/"))return msg("extractMessage","Please choose an image or screenshot.");
  if(file.size>10*1024*1024)return msg("extractMessage","That image is larger than 10 MB. Try a smaller screenshot.");

  const btn=$("extractIngredientsBtn");
  btn.disabled=true;
  msg("extractMessage","Reading the recipe… this may take a few seconds.");

  try{
    const imageBase64=await fileToBase64(file);
    const {data,error}=await sb.functions.invoke("extract-ingredients",{
      body:{imageBase64,mimeType:file.type}
    });
    if(error)throw error;
    if(!data?.success){
      throw new Error(data?.message||data?.error||"I couldn't clearly find recipe information in that image.");
    }

    const extractedIngredients=String(data.ingredients||"").trim();
    const extractedDirections=String(data.directions||"").trim();

    if(!extractedIngredients&&!extractedDirections)throw new Error("No recipe text was found.");

    const hasExisting=$("ingredients").value.trim()||$("directions").value.trim();
    if(hasExisting){
      const replace=confirm("There is already text in Ingredients or Directions.\n\nOK = replace those fields with the recipe read from the image.\nCancel = keep your existing text.");
      if(!replace){
        msg("extractMessage","Your existing recipe text was kept.",true);
        return;
      }
    }

    if(extractedIngredients)$("ingredients").value=extractedIngredients;
    if(extractedDirections)$("directions").value=extractedDirections;

    const found=[];
    if(extractedIngredients)found.push("ingredients");
    if(extractedDirections)found.push("directions");
    msg("extractMessage",`Found ${found.join(" and ")}! Review and edit the text below before saving.`,true);
    $("ingredients").scrollIntoView({behavior:"smooth",block:"center"});
  }catch(err){
    console.error(err);
    let detail=err?.message||String(err);
    try{
      if(err?.context?.json){
        const body=await err.context.json();
        detail=body?.error||body?.message||detail;
      }
    }catch(_){}
    msg("extractMessage","Recipe reader error: "+detail);
  }finally{
    btn.disabled=false;
  }
};


async function optimizePhoto(file){
  if(!file||!file.type?.startsWith("image/"))return file;
  const MAX_DIM=1600,QUALITY=.78;
  const bitmap=await createImageBitmap(file);
  const scale=Math.min(1,MAX_DIM/Math.max(bitmap.width,bitmap.height));
  const width=Math.max(1,Math.round(bitmap.width*scale));
  const height=Math.max(1,Math.round(bitmap.height*scale));
  const canvas=document.createElement("canvas");
  canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext("2d",{alpha:false});
  ctx.drawImage(bitmap,0,0,width,height);
  if(bitmap.close)bitmap.close();
  const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("Could not optimize photo.")),"image/jpeg",QUALITY));
  const base=(file.name||"recipe-photo").replace(/\.[^.]+$/,"").replace(/[^a-zA-Z0-9._-]/g,"_");
  return new File([blob],`${base}-optimized.jpg`,{type:"image/jpeg",lastModified:Date.now()});
}

async function uploadFile(file,kind,recipeId){if(!file)return null;const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,"_");const path=`${currentUser.id}/${recipeId}/${kind}-${Date.now()}-${safe}`;const {error}=await sb.storage.from("recipe-files").upload(path,file,{upsert:false});if(error)throw error;return path}

$("deleteRecipeBtn").onclick=async()=>{
  const id=$("recipeId").value;
  const r=recipes.find(x=>x.id===id);
  if(!r)return;
  const ok=confirm(`Delete "${r.recipe_name}"?\n\nThis will permanently delete the recipe. This cannot be undone.`);
  if(!ok)return;

  $("deleteRecipeBtn").disabled=true;
  msg("saveMessage","Deleting recipe…");

  try{
    // Delete any files stored for this recipe first.
    const paths=[r.main_photo_path,r.recipe_file_path].filter(Boolean);
    if(paths.length){
      const {error:storageError}=await sb.storage.from("recipe-files").remove(paths);
      if(storageError)console.warn("Stored file cleanup:",storageError);
    }

    const {error}=await sb.from("recipes").delete().eq("id",id);
    if(error)throw error;

    $("recipeDialog").close();
    clearFilters();
    await loadRecipes();
  }catch(err){
    msg("saveMessage",err?.message||String(err));
  }finally{
    $("deleteRecipeBtn").disabled=false;
  }
};

$("recipeForm").onsubmit=async e=>{e.preventDefault();$("saveBtn").disabled=true;msg("saveMessage","Saving to your cloud recipe box…");try{const id=$("recipeId").value||crypto.randomUUID();const old=recipes.find(r=>r.id===id)||{};let mainPath=old.main_photo_path||null,filePath=old.recipe_file_path||null;let oldPhotoToRemove=null;if($("mainPhoto").files[0]){msg("saveMessage","Optimizing photo…");const optimized=await optimizePhoto($("mainPhoto").files[0]);msg("saveMessage","Uploading optimized photo…");mainPath=await uploadFile(optimized,"main",id);if(old.main_photo_path&&old.main_photo_path!==mainPath)oldPhotoToRemove=old.main_photo_path}const row={id,user_id:currentUser.id,recipe_name:$("recipeName").value.trim(),category:$("category").value,tags:[...new Set($("tags").value.split(",").map(x=>x.trim()).filter(Boolean))],ingredients:$("ingredients").value,directions:$("directions").value,prep_time:$("prepTime").value,cook_time:$("cookTime").value,servings:$("servings").value,nutrition:$("nutrition").value,source_url:$("sourceUrl").value.trim()||null,main_photo_path:mainPath,recipe_file_path:filePath,date_made:$("dateMade").value||null,notes:$("notes").value,favorite:!!old.favorite};const {error}=await sb.from("recipes").upsert(row);if(error)throw error;if(oldPhotoToRemove)sb.storage.from("recipe-files").remove([oldPhotoToRemove]).catch(()=>{});$("recipeDialog").close();clearFilters();await loadRecipes();await showRecipe(id)}catch(err){msg("saveMessage",err?.message||String(err))}finally{$("saveBtn").disabled=false}};


function printRecipe(id,source="personal"){
  const r=source==="family"?familyRecipes.find(x=>x.id===id):recipes.find(x=>x.id===id);
  if(!r)return;
  document.getElementById("printSheet")?.remove();
  const sheet=document.createElement("section");sheet.id="printSheet";
  const lines=s=>esc(s||"").replace(/\n/g,"<br>");
  sheet.innerHTML=`<article class="print-recipe"><h1>${esc(r.recipe_name)}</h1>
  <div class="print-meta">${r.category?esc(r.category)+" • ":""}${r.prep_time?`Prep: ${esc(r.prep_time)} • `:""}${r.cook_time?`Cook: ${esc(r.cook_time)} • `:""}${r.servings?`Servings: ${esc(r.servings)}`:""}</div>
  ${r.mainPhotoUrl?`<img class="print-photo" src="${r.mainPhotoUrl}" alt="">`:""}
  ${r.ingredients?`<h2>Ingredients</h2><div>${lines(r.ingredients)}</div>`:""}
  ${r.directions?`<h2>Directions</h2><div>${lines(r.directions)}</div>`:""}
  ${r.notes?`<h2>Notes</h2><div>${lines(r.notes)}</div>`:""}
  ${r.nutrition?`<h2>Nutrition</h2><div>${lines(r.nutrition)}</div>`:""}</article>`;
  document.body.appendChild(sheet);
  const cleanup=()=>document.getElementById("printSheet")?.remove();
  window.addEventListener("afterprint",cleanup,{once:true});
  window.print();
  setTimeout(()=>{window.addEventListener("focus",()=>setTimeout(cleanup,300),{once:true})},50);
}
async function showRecipe(id){const r=recipes.find(x=>x.id===id);if(!r)return;const original=await signedUrl(r.recipe_file_path);const isPdf=(r.recipe_file_path||"").toLowerCase().endsWith(".pdf");$("recipeView").innerHTML=`<h2>${esc(r.recipe_name)}</h2><div class="view-actions"><button class="favorite" data-favorite="${id}">${r.favorite?"★ Favorite":"☆ Add to Favorites"}</button><button data-family-share="${id}">❤️ Family</button><button data-edit="${id}">Edit</button><button data-print="${id}">🖨️ Print</button><button class="add-grocery-recipe" data-add-grocery="${id}">🛒 Add to Grocery List</button></div>${r.mainPhotoUrl?`<img class="recipe-image" src="${r.mainPhotoUrl}" alt="">`:""}<p><b>${esc(r.category||"")}</b> ${(r.tags||[]).map(t=>`<button class="tag view-tag" data-tag="${esc(t)}">${esc(t)}</button>`).join("")}</p><p>${r.prep_time?`Prep: ${esc(r.prep_time)} &nbsp;`:""}${r.cook_time?`Cook: ${esc(r.cook_time)} &nbsp;`:""}${r.servings?`Servings: ${esc(r.servings)}`:""}</p>${r.ingredients?`<h3>Ingredients</h3><div class="pre">${esc(r.ingredients)}</div>`:""}${r.directions?`<h3>Directions</h3><div class="pre">${esc(r.directions)}</div>`:""}${original?(isPdf?`<h3>Original Recipe PDF</h3><a class="pdf-link" href="${original}" target="_blank">📄 Open saved PDF</a>`:`<h3>Original Recipe Screenshot</h3><img class="recipe-image" src="${original}" alt="">`):""}${r.source_url?`<p><a href="${esc(r.source_url)}" target="_blank" rel="noopener">🔗 View original webpage</a></p>`:""}${r.nutrition?`<h3>Nutrition</h3><p>${esc(r.nutrition)}</p>`:""}${r.date_made?`<h3>Date Made</h3><p>${esc(r.date_made)}</p>`:""}${r.notes?`<h3>My Notes</h3><div class="pre">${esc(r.notes)}</div>`:""}`;$("viewDialog").showModal()}


document.addEventListener("change",async e=>{
  const id=e.target?.dataset?.grocerySection;
  if(!id)return;
  e.stopPropagation();
  const {error}=await sb.from("grocery_items").update({grocery_section:e.target.value}).eq("id",id);
  if(error)return alert(error.message);
  const item=groceryItems.find(x=>x.id===id);
  if(item)item.grocery_section=e.target.value;
  drawGroceryList();
  updateGroceryBadge();
});

document.addEventListener("click",async e=>{
  if(e.target.dataset.addGrocery){openIngredientPicker(e.target.dataset.addGrocery);return}
  if(e.target.dataset.groceryCheck){
    const id=e.target.dataset.groceryCheck;
    const {error}=await sb.from("grocery_items").update({checked:e.target.checked}).eq("id",id);
    if(error){alert(error.message);e.target.checked=!e.target.checked;return}
    await loadGroceryItems();return
  }
  if(e.target.dataset.groceryDelete){
    const {error}=await sb.from("grocery_items").delete().eq("id",e.target.dataset.groceryDelete);
    if(error)return alert(error.message);
    await loadGroceryItems();return
  }
  if(e.target.dataset.deleteCategory){
    e.stopPropagation();
    const id=e.target.dataset.deleteCategory,name=e.target.dataset.deleteName;
    const used=recipes.filter(r=>r.category===name).length;
    const warning=used?`"${name}" is used by ${used} recipe${used===1?"":"s"}. Deleting the category will NOT delete those recipes, but the category button will disappear. Continue?`:`Delete the custom category "${name}"?`;
    if(!confirm(warning))return;
    const {error}=await sb.from("categories").delete().eq("id",id);
    if(error)return alert(error.message);
    if(activeCategory===name)activeCategory="";
    await loadCategories();drawRecipes();return;
  }
  if(e.target.dataset.category!==undefined){activeCategory=e.target.dataset.category;activeTag="";favoritesOnly=false;$("search").value="";drawCategories();drawTagCloud();drawRecipes();return}
  if(e.target.dataset.tag!==undefined){activeTag=e.target.dataset.tag;activeCategory="";favoritesOnly=false;$("search").value="";drawCategories();drawTagCloud();drawRecipes();if($("viewDialog").open)$("viewDialog").close();return}
  const card=e.target.closest("[data-view]");if(card){showRecipe(card.dataset.view);return}
  if(e.target.dataset.favorite){const r=recipes.find(x=>x.id===e.target.dataset.favorite);const {error}=await sb.from("recipes").update({favorite:!r.favorite}).eq("id",r.id);if(!error){$("viewDialog").close();await loadRecipes();await showRecipe(r.id)}return}
  if(e.target.dataset.familyShare){await shareRecipeToFamily(e.target.dataset.familyShare);return}
  if(e.target.dataset.print){printRecipe(e.target.dataset.print);return}
  if(e.target.dataset.edit){const r=recipes.find(x=>x.id===e.target.dataset.edit);$("viewDialog").close();$("recipeForm").reset();drawCategories();msg("extractMessage","");$("deleteRecipeBtn").hidden=false;$("recipeId").value=r.id;$("formTitle").textContent="Edit Recipe";$("recipeName").value=r.recipe_name||"";if(r.category&&!allCategoryNames().includes(r.category)){$("category").insertAdjacentHTML("beforeend",`<option value="${esc(r.category)}">${esc(r.category)} (previous)</option>`)}$("category").value=r.category||allCategoryNames()[0];$("tags").value=(r.tags||[]).join(", ");$("sourceUrl").value=r.source_url||"";$("ingredients").value=r.ingredients||"";$("directions").value=r.directions||"";$("prepTime").value=r.prep_time||"";$("cookTime").value=r.cook_time||"";$("servings").value=r.servings||"";$("nutrition").value=r.nutrition||"";$("dateMade").value=r.date_made||"";$("notes").value=r.notes||"";msg("saveMessage","");$("recipeDialog").showModal()}
});
start();
if("serviceWorker" in navigator){
  window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
}

document.addEventListener("pointerdown",e=>{if(e.target?.matches?.(".grocery-section-select"))e.stopPropagation()},true);
document.addEventListener("click",e=>{if(e.target?.matches?.(".grocery-section-select"))e.stopPropagation()},true);
