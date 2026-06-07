export interface LSnap{layerId:string;dataUrl:string}
export interface HEntry{id:string;name:string;ts:number;snaps:LSnap[];activeIdx:number}
export class History{
  private _e:HEntry[]=[];private _i=-1;max=500;
  get canUndo(){return this._i>=0}get canRedo(){return this._i<this._e.length-1}
  get all(){return this._e}get idx(){return this._i}
  push(e:HEntry):void{this._e=this._e.slice(0,this._i+1);this._e.push(e);this._i=this._e.length-1;while(this._e.length>this.max){this._e.shift();this._i--}}
  undo():HEntry|null{if(!this.canUndo)return null;this._i--;return this._e[this._i]}
  redo():HEntry|null{if(!this.canRedo)return null;this._i++;return this._e[this._i]}
  jump(i:number):HEntry|null{if(i>=0&&i<this._e.length){this._i=i;return this._e[i]}return null}
  clear():void{this._e=[];this._i=-1}
}
