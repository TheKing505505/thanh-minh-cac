function formatPrice(p){return new Intl.NumberFormat('vi-VN').format(p)+'đ';}
function generateOrderId(){return 'TMC-'+secureRandomString(10);}
function getServiceImage(svc){return(svc.image&&svc.image.length>10)?svc.image:(DEFAULT_IMAGES[svc.category]||DEFAULT_IMAGES.other);}
