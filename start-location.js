/* Shared car/bus setup. Coordinates are requested only after a player clicks. */
function openDriveSetup(isBus){
 if(loading){$('status').textContent='Please wait for scenery to finish loading.';return;}
 if(trainMode?.active||trainMode?.walker?.active)trainMode.stop();if(flight?.active)flight.stop();
 if(!isBus&&bus?.active)bus.deactivate();
 if(challenge?.active)challenge.finish(false,'Changed vehicle');if(isBus){bus.doorsOpen=false;bus.serviceKey='';bus.stopIndex=0;bus.onboard=0;bus.active=true;bus.model.visible=true;vehicle.visible=false;$('bus-hud').hidden=false;document.body.classList.add('driving-bus');}
 keys.clear();$('mode-choice').close();$('loading').classList.add('hidden');
 fromPoint=null;toPoint=null;
 for(const which of ['from','to']){$(which+'-place').value='';$(which+'-selection').textContent=which==='from'?'Choose your location or search for a city.':'Optional: search for a destination.';}
 $('route-status').textContent='';$('journey-results').replaceChildren();$('start-journey').disabled=true;if(typeof PlayerProfile!=='undefined')PlayerProfile.resume();$('journey').showModal();
}
$('choose-car').onclick=()=>openDriveSetup(false);
$('choose-bus').onclick=()=>bus.choose();
$('use-location').onclick=()=>{
 const button=$('use-location');
 if(!navigator.geolocation){$('route-status').textContent='Location is unavailable in this browser. Enter a city instead.';return;}
 button.disabled=true;$('route-status').textContent='Waiting for location permission…';
 navigator.geolocation.getCurrentPosition(position=>{
  selectJourneyPoint('from',{lat:position.coords.latitude,lon:position.coords.longitude,name:'My location',region:'Starts on the nearest mapped road'});
  button.disabled=false;$('route-status').textContent='Location selected. Add a destination or press Start drive.';
 },error=>{button.disabled=false;$('route-status').textContent=error.code===1?'Location permission was declined. Enter a starting city instead.':'Could not find your location. Enter a city or try again.';},{enableHighAccuracy:true,timeout:15000,maximumAge:60000});
};
$('free-roam').onclick=()=>{if(!fromPoint){$('route-status').textContent='Choose a starting location first.';return;}toPoint=null;$('to-place').value='';$('start-journey').click();};
