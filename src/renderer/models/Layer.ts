import { BlendMode, b2co } from './ToolType';
let _lid=0;
export class Layer{
  id=`L${++_lid}`;name:string;visible=true;opacity=255;blendMode:BlendMode=BlendMode.Normal;locked=false;
  private _c:HTMLCanvasElement;private _ctx:CanvasRenderingContext2D;
  constructor(name:string,w:number,h:number){this.name=name;this._c=document.createElement('canvas');this._c.width=w;this._c.height=h;this._ctx=this._c.getContext('2d')!;}
  get canvas(){return this._c}get ctx(){return this._ctx}get width(){return this._c.width}get height(){return this._c.height}
  get cop():GlobalCompositeOperation{return b2co(this.blendMode)}
  resize(w:number,h:number):void{const t=document.createElement('canvas');t.width=this.width;t.height=this.height;t.getContext('2d')!.drawImage(this._c,0,0);this._c.width=w;this._c.height=h;this._ctx=this._c.getContext('2d')!;this._ctx.drawImage(t,0,0)}
  clear():void{this._ctx.clearRect(0,0,this.width,this.height)}
  drawImage(img:CanvasImageSource,x=0,y=0):void{this._ctx.drawImage(img,x,y)}
  getImageData(x:number,y:number,w:number,h:number):ImageData{return this._ctx.getImageData(x,y,w,h)}
  putImageData(d:ImageData,x:number,y:number):void{this._ctx.putImageData(d,x,y)}
  clone():Layer{const l=new Layer(this.name+' copy',this.width,this.height);l.opacity=this.opacity;l.blendMode=this.blendMode;l.visible=this.visible;l.ctx.drawImage(this._c,0,0);return l}
  thumb(sz=40):string{const s=Math.min(sz/this.width,sz/this.height,1);const c=document.createElement('canvas');c.width=Math.round(this.width*s);c.height=Math.round(this.height*s);c.getContext('2d')!.drawImage(this._c,0,0,c.width,c.height);return c.toDataURL()}
  snap():string{return this._c.toDataURL()}
  restore(url:string):Promise<void>{return new Promise(r=>{const i=new Image();i.onload=()=>{this._ctx.clearRect(0,0,this.width,this.height);this._ctx.drawImage(i,0,0);r()};i.src=url})}
}
