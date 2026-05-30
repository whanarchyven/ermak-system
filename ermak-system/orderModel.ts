export type OrderType = 'delivery'|'restaurant'|'self-service';
export type OrderStatus = 'backlog'|'accepted'|'pending'|'ready'|'completed'|'cancelled'|'refund';
export type PaymentMethod = 'cash'|'card'|'online';
export interface Order {
  _id: string;
  type:OrderType;
  status:OrderStatus;
  clientId?: string;
  clientInfo?: {
    name: string;
    phone: string;
  };
  positions:{
    positionId:string;
    quantity:number;
  }[];
  address?:string;
  summ:number;
  out_summ:number;
  discount_summ:number;
  payment_method:PaymentMethod;
  is_paid:boolean;
  createdAt:Date;
  updatedAt:Date;
  comment?:string;
  promocode?:Promocode;
}

export interface Client{
    _id: string;
    tgInfo:any;
    cart:any[];
    addressPool:string[];
    namePool:string[];
    phonePool:string[];
    createdAt:Date;
    updatedAt:Date;
}

export type PromocodeScaleType="fixed"|"percent";
export type PromocodeType="category"|"position"|"order";

export interface Promocode{
    scaleType:PromocodeScaleType;
    type:PromocodeType;
    name:string;
    categoryId?:string;
    positionId?:string;
    promocode:string;
    value:number;
    createdAt:Date;
    updatedAt:Date;
}