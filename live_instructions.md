strictly follow karna hai in steps ko agar koi bhe dusri flow hai to use remove kar ke same ise follow karna hai
standard sign up vs readers gate sign up:
Yahan standard sign up se matlb hai ke user puri app mein kahin se bhe sign up karega to wo standard hi kahlayega lekin agar user kisi chapter par aane wale sign up modal ke zariye sign up karega to wo standard nahi balke reader's gate(reader_gate) wala user hoga.
Standard Sign up flow:
user jab sign up karega to key hogi signup_source='standard' save rahega google/clerk se auth hone ke baad jab user app par wapas aayega to hm use onboarding ke dono steps dikhayenge aur nav bar mein sare routes disabled honge aur onboarding ka jo flag hai wo false rahega ye saara kam dynamically hoga na ke browser storage se like onboarding ka key bhe DB mein save hona chahiye jahan se wo dynamicallly update aur fetch ho sake. jab user dono steps ko complete kar lega tab hm is onboarding ko true karenge. Step 2 ke complete hote hi puri app accesable hogi. 

Agar kisi ne step 1 ya 2 par hi chor diya hai tab ?
agar koi aisa karta hai tab hm onboarding ko false hi consider karenge aur us user ke corresponding DB mein onboarding false hi rahegi aur UI par bhe isi ke according show hogi na ke browser storage mein jo key saved hai uske according.

Agar ek user ne onboarding complete nahi ki hai aur wo kisi dusre device par account login karta hai tab us device par bhe hme onboariding false hi milna chahiye aur ye hi consider hona chahiye ke is user ne abhi tak onboarding complete nahi ki hai. 

reader_gate_converted key is type ke sign up mein false hi rahegi.
