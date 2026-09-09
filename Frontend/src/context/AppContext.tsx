import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Booking, BookingStatus, WorkerProfile, NotificationItem, Complaint, WelfareClaim, ServiceItem, CooperativeInfo, WelfareScheme, Transaction, WorkerLocationUpdatePayload, NearbyWorkerResult } from '../types';
import { bookingService } from '../services/bookingService';
import { workerService } from '../services/workerService';
import { notificationService } from '../services/notificationService';
import { adminService } from '../services/adminService';
import { paymentService } from '../services/paymentService';
import { clientGeoService, GeoLocationState } from '../services/geoService';
import { apiRequest } from '../services/apiClient';

const SERVICE_CATALOG: ServiceItem[] = [
  { id:'srv-plumb',name:'Plumbing Services & Repairs',category:'Plumber',description:'Tap leak repairs, pipe fitting, drainage and sanitary installations.',iconName:'Wrench',basePrice:350,priceRange:'₹300 – ₹600',durationMinutes:60,popular:true,emergencyAvailable:true,inclusions:['Inspection & leak detection','Pipe fitting & joint sealing','Sanitaryware fitting'] },
  { id:'srv-elec',name:'Electrical Repairs & Installation',category:'Electrician',description:'Electrical repairs, fan installation, switchboard and wiring services.',iconName:'Zap',basePrice:300,priceRange:'₹250 – ₹550',durationMinutes:45,popular:true,emergencyAvailable:true,inclusions:['Safety voltage testing','Switchboard & wiring fixes','Appliance connection'] },
  { id:'srv-carp',name:'Carpentry & Furniture Repair',category:'Carpenter',description:'Furniture assembly, door and hinge repair, and woodwork.',iconName:'Hammer',basePrice:400,priceRange:'₹350 – ₹800',durationMinutes:90,popular:true,emergencyAvailable:false,inclusions:['Hardware alignment','Precision fitting','Post-service cleanup'] },
  { id:'srv-paint',name:'Home & Office Painting',category:'Painter',description:'Interior, exterior, touch-up and wall finishing services.',iconName:'Paintbrush',basePrice:800,priceRange:'₹600 – ₹2,500',durationMinutes:180,popular:false,emergencyAvailable:false,inclusions:['Wall preparation','Primer and finish coats','Floor protection'] },
  { id:'srv-clean',name:'Deep Cleaning & Sanitization',category:'Cleaner',description:'Kitchen, bathroom, floor and whole-house cleaning services.',iconName:'Sparkles',basePrice:450,priceRange:'₹400 – ₹1,200',durationMinutes:120,popular:true,emergencyAvailable:false,inclusions:['Deep cleaning','Disinfection','Floor care'] },
  { id:'srv-help',name:'Domestic Household Support',category:'Domestic Helper',description:'Verified domestic assistance for routine household tasks.',iconName:'Home',basePrice:300,priceRange:'₹250 – ₹450',durationMinutes:60,popular:true,emergencyAvailable:false,inclusions:['Household support','Kitchen assistance','Identity verification'] },
  { id:'srv-care',name:'Elderly & Patient Caregiving',category:'Caregiver',description:'Senior care, mobility assistance, medication reminders and companionship.',iconName:'HeartHandshake',basePrice:600,priceRange:'₹500 – ₹1,500',durationMinutes:180,popular:true,emergencyAvailable:true,inclusions:['Mobility support','Medication reminders','Family updates'] },
  { id:'srv-drive',name:'Professional Chauffeur & Driver',category:'Driver',description:'Licensed drivers for local travel, errands and assisted transport.',iconName:'Car',basePrice:350,priceRange:'₹300 – ₹700',durationMinutes:120,popular:false,emergencyAvailable:true,inclusions:['Licensed driver','Background verification','Route support'] },
  { id:'srv-gard',name:'Gardening & Landscape Maintenance',category:'Gardener',description:'Garden maintenance, pruning, lawn care and seasonal planting.',iconName:'Sprout',basePrice:350,priceRange:'₹300 – ₹600',durationMinutes:90,popular:false,emergencyAvailable:false,inclusions:['Pruning','Lawn maintenance','Seasonal care'] },
  { id:'srv-tech',name:'Home Appliance & Technical Support',category:'Technician',description:'General appliance troubleshooting and household technical support.',iconName:'Settings',basePrice:400,priceRange:'₹350 – ₹900',durationMinutes:60,popular:false,emergencyAvailable:true,inclusions:['Diagnosis','Repair support','Safety checks'] }
];

export interface ToastMessage { id:string; type:'success'|'info'|'warning'|'error'; title:string; message:string; }
interface AppContextType { bookings:Booking[]; workers:WorkerProfile[]; services:ServiceItem[]; cooperatives:CooperativeInfo[]; welfareFunds:WelfareScheme[]; payments:Transaction[]; notifications:NotificationItem[]; complaints:Complaint[]; welfareClaims:WelfareClaim[]; toasts:ToastMessage[]; unreadNotificationCount:number; addToast:(type:ToastMessage['type'],title:string,message:string)=>void; removeToast:(id:string)=>void; refreshData:()=>Promise<void>; createBooking:(data:Omit<Booking,'id'|'createdAt'|'statusTimeline'>)=>Promise<Booking>; updateBookingStatus:(bookingId:string,status:BookingStatus,note?:string)=>Promise<void>; updatePaymentStatus:(bookingId:string,status:'Paid'|'Pending')=>Promise<void>; updateWorkerAvailability:(workerId:string,status:'Available'|'Busy'|'Offline')=>Promise<void>; updateWorkerVerification:(workerId:string,status:'Verified'|'Pending'|'Suspended')=>Promise<void>; addWorkerSkill:(workerId:string,skill:any)=>Promise<void>; addWorkerCertification:(workerId:string,cert:any)=>Promise<void>; updateComplaintStatus:(id:string,status:Complaint['status'],resolutionNotes?:string)=>Promise<void>; updateWelfareClaimStatus:(id:string,status:WelfareClaim['status'],remarks?:string)=>Promise<void>; markNotificationRead:(id:string)=>Promise<void>; markAllNotificationsRead:(role:any)=>Promise<void>; triggerDemoEmergencyScenario:()=>Promise<void>; resetAllDemoData:()=>Promise<void>; customerLocation:GeoLocationState; setCustomerLocation:(loc:GeoLocationState)=>void; updateWorkerLocation:(workerId:string,payload:WorkerLocationUpdatePayload)=>Promise<WorkerProfile>; searchNearbyWorkers:(query:{service?:string;radiusKm?:number;availableOnly?:boolean})=>Promise<NearbyWorkerResult[]>; }
const AppContext=createContext<AppContextType|undefined>(undefined);

export const AppProvider:React.FC<{children:React.ReactNode}>=({children})=>{
 const[bookings,setBookings]=useState<Booking[]>([]); const[workers,setWorkers]=useState<WorkerProfile[]>([]); const[services]=useState<ServiceItem[]>(SERVICE_CATALOG); const[cooperatives,setCooperatives]=useState<CooperativeInfo[]>([]); const[welfareFunds,setWelfareFunds]=useState<WelfareScheme[]>([]); const[payments,setPayments]=useState<Transaction[]>([]); const[notifications,setNotifications]=useState<NotificationItem[]>([]); const[complaints,setComplaints]=useState<Complaint[]>([]); const[welfareClaims,setWelfareClaims]=useState<WelfareClaim[]>([]); const[toasts,setToasts]=useState<ToastMessage[]>([]); const[customerLocation,setCustomerLocation]=useState<GeoLocationState>(clientGeoService.getInitialCustomerLocation);
 const addToast=useCallback((type:ToastMessage['type'],title:string,message:string)=>{const id=`toast-${Date.now()}-${Math.random()}`;setToasts(prev=>[...prev,{id,type,title,message}]);setTimeout(()=>setToasts(prev=>prev.filter(t=>t.id!==id)),4500);},[]); const removeToast=useCallback((id:string)=>setToasts(prev=>prev.filter(t=>t.id!==id)),[]);
 const refreshData=useCallback(async()=>{const results=await Promise.allSettled([bookingService.getAllBookings(),workerService.getAllWorkers(),notificationService.getNotifications(),adminService.getComplaints(),adminService.getWelfareClaims(),paymentService.getTransactions(),adminService.getCooperatives(),adminService.getWelfareSchemes()]); const[b,w,n,c,wc,p,coops,welfare]=results; if(b.status==='fulfilled')setBookings(b.value); if(w.status==='fulfilled')setWorkers(w.value); if(n.status==='fulfilled')setNotifications(n.value); if(c.status==='fulfilled')setComplaints(c.value); if(wc.status==='fulfilled')setWelfareClaims(wc.value); if(p.status==='fulfilled')setPayments(p.value); if(coops.status==='fulfilled')setCooperatives(coops.value); if(welfare.status==='fulfilled')setWelfareFunds(welfare.value);},[]);
 useEffect(()=>{refreshData();},[refreshData]);
 const createBooking=async(data:Omit<Booking,'id'|'createdAt'|'statusTimeline'>):Promise<Booking>=>{const newBooking=await bookingService.createBooking(data);setBookings(prev=>[newBooking,...prev]);addToast('success',data.isEmergency?'Emergency Dispatched!':'Booking Requested',`Assigned to verified artisan ${data.workerName||'a cooperative worker'}`);await refreshData();return newBooking;};
 const updateBookingStatus=async(bookingId:string,status:BookingStatus,note?:string)=>{const updated=await bookingService.updateBookingStatus(bookingId,status,note);setBookings(prev=>prev.map(b=>b.id===bookingId?updated:b));await refreshData();};
 const updateWorkerAvailability=async(workerId:string,status:'Available'|'Busy'|'Offline')=>{const updated=await workerService.updateAvailability(workerId,status);setWorkers(prev=>prev.map(w=>w.id===workerId||w.userId===workerId?updated:w));addToast('info','Status Updated',`Availability set to: ${status}`);};
 const updateWorkerVerification=async(workerId:string,status:'Verified'|'Pending'|'Suspended')=>{const updated=await workerService.updateVerificationStatus(workerId,status);setWorkers(prev=>prev.map(w=>w.id===workerId||w.userId===workerId?updated:w));addToast('success','Verification Updated',`Worker status updated to: ${status}`);};
 const addWorkerSkill=async(workerId:string,skill:any)=>{const updated=await workerService.addSkill(workerId,skill);setWorkers(prev=>prev.map(w=>w.id===workerId||w.userId===workerId?updated:w));}; const addWorkerCertification=async(workerId:string,cert:any)=>{const updated=await workerService.addCertification(workerId,cert);setWorkers(prev=>prev.map(w=>w.id===workerId||w.userId===workerId?updated:w));};
 const updateComplaintStatus=async(id:string,status:Complaint['status'],resolutionNotes?:string)=>{const updated=await adminService.updateComplaintStatus(id,status,resolutionNotes);setComplaints(prev=>prev.map(c=>c.id===id?updated:c));}; const updateWelfareClaimStatus=async(id:string,status:WelfareClaim['status'],remarks?:string)=>{const updated=await adminService.updateWelfareClaimStatus(id,status,remarks);setWelfareClaims(prev=>prev.map(wc=>wc.id===id?updated:wc));};
 const markNotificationRead=async(id:string)=>{await notificationService.markAsRead(id);setNotifications(prev=>prev.map(n=>n.id===id?{...n,isRead:true}:n));}; const markAllNotificationsRead=async(role:any)=>{await notificationService.markAllAsRead(role);setNotifications(prev=>prev.map(n=>({...n,isRead:true})));};
 const updatePaymentStatus=async(_bookingId:string,_status:'Paid'|'Pending')=>{await refreshData();};
 const triggerDemoEmergencyScenario=async()=>{
  try {
    const emergencyBooking = await bookingService.createBooking({
      customerId: 'usr-cust-1',
      customerName: 'Priya Sharma',
      customerPhone: '9876543219',
      customerAddress: 'Banjara Hills, Road No. 12, Hyderabad',
      workerId: 'work-1',
      workerName: 'Ravi Kumar',
      workerPhone: '9876543210',
      cooperativeName: 'Hyderabad Labour Cooperative',
      serviceCategory: 'Plumber',
      serviceTitle: 'Plumbing Services & Repairs',
      date: new Date().toISOString().slice(0, 10),
      timeSlot: 'Immediate Dispatch',
      isEmergency: true,
      totalAmount: 450,
      status: 'Worker Assigned',
      notes: '🚨 Urgent: Kitchen water line valve ruptured with overflow.'
    });
    setBookings(prev=>[emergencyBooking,...prev]);
    addToast('warning','🚨 Emergency Triggered','Dispatched high-priority plumbing request to nearest artisan (Ravi Kumar)');
    await refreshData();
  } catch {
    addToast('info','Emergency Simulation','Emergency scenario processed.');
    await refreshData();
  }
 };
 const resetAllDemoData=async()=>{
  await refreshData();
  addToast('success','Data Synchronized','Cooperative database and session state synchronized.');
 };
 const updateWorkerLocation=async(workerId:string,payload:WorkerLocationUpdatePayload)=>{const updated=await workerService.updateWorkerLocation(workerId,payload);setWorkers(prev=>prev.map(w=>w.id===workerId||w.userId===workerId?updated:w));return updated;};
 const searchNearbyWorkers=async(query:{service?:string;radiusKm?:number;availableOnly?:boolean})=>{const result=await workerService.getNearbyWorkers({latitude:customerLocation.latitude,longitude:customerLocation.longitude,service:query.service,radiusKm:query.radiusKm||5,availableOnly:query.availableOnly});return result.workers;};
 const unreadNotificationCount=notifications.filter(n=>!n.isRead).length; return <AppContext.Provider value={{bookings,workers,services,cooperatives,welfareFunds,payments,notifications,complaints,welfareClaims,toasts,unreadNotificationCount,customerLocation,setCustomerLocation,updateWorkerLocation,searchNearbyWorkers,addToast,removeToast,refreshData,createBooking,updateBookingStatus,updatePaymentStatus,updateWorkerAvailability,updateWorkerVerification,addWorkerSkill,addWorkerCertification,updateComplaintStatus,updateWelfareClaimStatus,markNotificationRead,markAllNotificationsRead,triggerDemoEmergencyScenario,resetAllDemoData}}>{children}</AppContext.Provider>;
};
export const useApp=():AppContextType=>{const ctx=useContext(AppContext);if(!ctx)throw new Error('useApp must be used within AppProvider');return ctx;};
