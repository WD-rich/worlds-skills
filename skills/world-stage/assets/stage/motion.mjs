// Navigation and sprite projection. No writes to world facts.
export const distance = (a,b) => Math.hypot(a[0]-b[0],a[1]-b[1]);
export function inPolygon([x,y], polygon) {
  let inside=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
    const [ax,ay]=polygon[i], [bx,by]=polygon[j];
    if(((ay>y)!==(by>y)) && x<(bx-ax)*(y-ay)/(by-ay)+ax) inside=!inside;
  }
  return inside;
}
export function isWalkable(nav,p) {
  return nav.ground.some(poly=>inPolygon(p,poly)) && !(nav.obstacles||[]).some(poly=>inPolygon(p,poly));
}
export function nearestWalkable(nav,p,maxRadius=160) {
  if (isWalkable(nav,p)) return p;
  const step=nav.cellSize||16;
  let best=null;
  for(let radius=step;radius<=maxRadius;radius+=step) {
    const count=Math.max(8,Math.ceil(radius/step*8));
    for(let i=0;i<count;i++) {
      const angle=i/count*Math.PI*2;
      const candidate=[p[0]+Math.cos(angle)*radius,p[1]+Math.sin(angle)*radius];
      if(candidate[0]<0||candidate[1]<0||candidate[0]>(nav.size?.[0]||Infinity)||candidate[1]>(nav.size?.[1]||Infinity)) continue;
      if(isWalkable(nav,candidate)) {
        const score=distance(p,candidate);
        if(!best||score<best.score) best={point:candidate,score};
      }
    }
    if(best) return best.point;
  }
  return null;
}
export function clearSegment(nav,a,b) {
  const steps=Math.max(1,Math.ceil(distance(a,b)/4));
  for(let i=0;i<=steps;i++) if(!isWalkable(nav,[a[0]+(b[0]-a[0])*i/steps,a[1]+(b[1]-a[1])*i/steps])) return false;
  return true;
}
export function findPath(nav,from,to) {
  const startPoint=nearestWalkable(nav,from);
  const endPoint=nearestWalkable(nav,to);
  if(!startPoint||!endPoint) return [];
  if(clearSegment(nav,startPoint,endPoint)) return [startPoint,endPoint];
  const step=nav.cellSize||16, [w,h]=nav.size, cols=Math.ceil(w/step), rows=Math.ceil(h/step);
  const point=key=>[(key%cols+.5)*step,(Math.floor(key/cols)+.5)*step];
  const gridKey=p=>Math.floor(p[1]/step)*cols+Math.floor(p[0]/step);
  const closest=p=> {
    const k=gridKey(p), x=k%cols,y=Math.floor(k/cols), candidates=[];
    for(let dy=-2;dy<=2;dy++) for(let dx=-2;dx<=2;dx++) if(x+dx>=0&&x+dx<cols&&y+dy>=0&&y+dy<rows) candidates.push((y+dy)*cols+x+dx);
    return candidates.filter(k=>clearSegment(nav,p,point(k))).sort((a,b)=>distance(p,point(a))-distance(p,point(b)))[0];
  };
  const start=closest(startPoint), end=closest(endPoint);
  if(start===undefined||end===undefined) return [];
  const open=new Set([start]), closed=new Set(), costs=new Map([[start,0]]), parents=new Map();
  while(open.size) {
    let current,score=Infinity;
    for(const key of open) {const f=costs.get(key)+distance(point(key),point(end));if(f<score){score=f;current=key;}}
    if(current===end) {
      const path=[endPoint,point(end)];let key=end;
      while(parents.has(key)){key=parents.get(key);path.push(point(key));}
      path.push(startPoint);path.reverse();
      const simple=[path[0]];let i=0;
      while(i<path.length-1){let j=path.length-1;while(j>i+1&&!clearSegment(nav,path[i],path[j]))j--;simple.push(path[j]);i=j;}
      return simple;
    }
    open.delete(current);closed.add(current);
    const cx=current%cols,cy=Math.floor(current/cols);
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]) {
      const x=cx+dx,y=cy+dy,key=y*cols+x;
      if(x<0||x>=cols||y<0||y>=rows||closed.has(key)||!clearSegment(nav,point(current),point(key)))continue;
      const g=costs.get(current)+distance(point(current),point(key));
      if(g<(costs.get(key)??Infinity)){costs.set(key,g);parents.set(key,current);open.add(key);}
    }
  }
  return [];
}
export function pathLength(path) {return path.slice(1).reduce((sum,p,i)=>sum+distance(p,path[i]),0);}
export function samplePath(path,travel) {
  if(!path.length)return null;
  for(let i=1;i<path.length;i++){const length=distance(path[i-1],path[i]);if(travel<length){const t=travel/length;return {point:path[i-1].map((v,k)=>v+(path[i][k]-v)*t),direction:directionOf(path[i-1],path[i]),done:false};}travel-=length;}
  return {point:path.at(-1),direction:path.length>1?directionOf(path.at(-2),path.at(-1)):'south',done:true};
}
export function directionOf(a,b){const x=b[0]-a[0],y=b[1]-a[1];return Math.abs(x)>Math.abs(y)*1.25?(x<0?'west':'east'):(y<0?'north':'south');}
export function spriteFrame(asset,direction,travel,moving,reduced=false){
  const row=Math.max(0,asset.directions.indexOf(direction));
  const col=moving&&!reduced?Math.floor(travel/(asset.stridePx||18))%asset.columns:0;
  return asset.frames[row*asset.columns+col];
}
export function screenToWorld(point,camera){return [(point[0]-camera.x)/camera.scale,(point[1]-camera.y)/camera.scale];}
export function worldToScreen(point,camera){return [point[0]*camera.scale+camera.x,point[1]*camera.scale+camera.y];}
