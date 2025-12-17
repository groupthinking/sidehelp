export function checkFirstRun(){
  return !localStorage.getItem('glicpp_onboarded');
}
export function markFREComplete(){
  localStorage.setItem('glicpp_onboarded','true');
}
