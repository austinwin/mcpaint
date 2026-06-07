import { Layer } from './Layer';
import { HEntry } from './HistoryEntry';
export class CanvasDoc{
  id=crypto.randomUUID();name:string;width:number;height:number;
  layers:Layer[]=[];activeIdx=-1;filePath:string|null=null;modified=false;
  constructor(name:string,w:number,h:number){this.name=name;this.width=w;this.height=h;this.addLayer('Background');this.layers[0].ctx.fillStyle='#fff';this.layers[0].ctx.fillRect(0,0,w,h)}
  get active():Layer|null{return this.layers[this.activeIdx]??null}
  addLayer(name:string):Layer{const l=new Layer(name,this.width,this.height);this.layers.splice(this.activeIdx+1,0,l);this.activeIdx++;this.modified=true;return l}
  delLayer(i:number):boolean{if(this.layers.length<=1)return false;this.layers.splice(i,1);if(this.activeIdx>=this.layers.length)this.activeIdx=this.layers.length-1;this.modified=true;return true}
  dupLayer(i:number):Layer|null{if(i<0||i>=this.layers.length)return null;const c=this.layers[i].clone();this.layers.splice(i+1,0,c);this.activeIdx=i+1;this.modified=true;return c}
  mergeDown(i:number):boolean{if(i<=0||i>=this.layers.length)return false;const u=this.layers[i],l=this.layers[i-1];l.ctx.globalAlpha=u.opacity/255;l.ctx.globalCompositeOperation=u.cop;l.ctx.drawImage(u.canvas,0,0);l.ctx.globalAlpha=1;l.ctx.globalCompositeOperation='source-over';this.layers.splice(i,1);this.activeIdx=i-1;this.modified=true;return true}
  moveUp(i:number):boolean{if(i>=this.layers.length-1)return false;[this.layers[i],this.layers[i+1]]=[this.layers[i+1],this.layers[i]];this.activeIdx=i+1;this.modified=true;return true}
  moveDown(i:number):boolean{if(i<=0)return false;[this.layers[i],this.layers[i-1]]=[this.layers[i-1],this.layers[i]];this.activeIdx=i-1;this.modified=true;return true}
  flatten():void{const c=this.composite();this.layers=[new Layer('Bg',this.width,this.height)];this.layers[0].drawImage(c);this.activeIdx=0;this.modified=true}
  resizeCanvas(w:number,h:number):void{for(const l of this.layers)l.resize(w,h);this.width=w;this.height=h;this.modified=true}
  composite():HTMLCanvasElement{const c=document.createElement('canvas');c.width=this.width;c.height=this.height;const x=c.getContext('2d')!;for(const l of this.layers){if(!l.visible)continue;x.globalAlpha=l.opacity/255;x.globalCompositeOperation=l.cop;x.drawImage(l.canvas,0,0)}x.globalAlpha=1;x.globalCompositeOperation='source-over';return c}
  snap(name:string):HEntry{return{id:crypto.randomUUID(),name,ts:Date.now(),snaps:this.layers.map(l=>({layerId:l.id,dataUrl:l.snap()})),activeIdx:this.activeIdx}}
  async restore(e:HEntry):Promise<void>{await Promise.all(e.snaps.map(async s=>{const l=this.layers.find(x=>x.id===s.layerId);if(l)await l.restore(s.dataUrl)}));this.activeIdx=e.activeIdx}
  toDataURL(t='image/png',q?:number):string{return this.composite().toDataURL(t,q)}
}
