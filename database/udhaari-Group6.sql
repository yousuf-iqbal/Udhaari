-- ==========================================================
-- udhaari database - group 6
-- deliverable 1 | database systems lab  
-- members: yousuf 24L-2539 | dua L24-2587 | khushbakht 24L-2604
-- ============================================================


--- database setup ---

use master;
go

if exists (select name from sys.databases where name = 'UdhaariDB')
    drop database UdhaariDB;
go

create database UdhaariDB;
go

use UdhaariDB;
go

-- create tables

-- table 1: users
-- every person on the platform | renter, lender, or admin
create table Users 
(
    UserID           int           primary key identity(1,1),
    FullName         nvarchar(100) not null,
    Email            nvarchar(100) not null unique,           -- no two accounts with same email
    Password         nvarchar(255) not null,                  -- stores bcrypt hash, never plain text
    Phone            nvarchar(20),
    City             nvarchar(50),
    Area             nvarchar(100),
    CNIC             nvarchar(15),
    CNICPicture      nvarchar(255),                           -- file path to uploaded cnic image
    ProfilePic       nvarchar(255),                           -- file path to profile photo
    IsVerified       bit           default 0,                 -- 0 = not admin verified, 1 = verified
    IsBanned         bit           default 0,                 -- 0 = active, 1 = banned
    Role             nvarchar(10)  default 'user'
                     check (Role in ('user', 'admin')),       
    OTPCode          nvarchar(6),                             -- 6-digit code sent to email
    OTPExpiresAt     datetime,                                -- otp becomes invalid after this time
    IsEmailVerified  bit           default 0,                 -- 0 = email not confirmed yet
    CreatedAt        datetime      default getdate()
);
go


-- table 2: categories
create table Categories 
(
    CategoryID  int           primary key identity(1,1),
    Name        nvarchar(50)  not null unique,    -- category names must be distinct
    Description nvarchar(200),
    IconURL     nvarchar(255)
);
go


-- table 3: assets
-- items listed by owners for rent
-- depends on: users, categories
create table Assets 
(
    AssetID     int            primary key identity(1,1),
    OwnerID     int            not null foreign key references Users(UserID),
    CategoryID  int            not null foreign key references Categories(CategoryID),
    Title       nvarchar(150)  not null,
    Description nvarchar(1000),
    PricePerDay decimal(10,2)  not null check (PricePerDay >= 0),
    Deposit     decimal(10,2)  default 0 check (Deposit >= 0),
    City        nvarchar(50),
    Area        nvarchar(100),
    IsActive    bit            default 1,          -- 1 = visible on bazaar, 0 = hidden
    CreatedAt   datetime       default getdate()
);
go


-- table 4: assetimages
-- multiple photos per asset
-- cascade: deleting an asset removes all its photos automatically
-- depends on: assets
create table AssetImages 
(
    ImageID   int           primary key identity(1,1),
    AssetID   int           not null
              foreign key references Assets(AssetID) on delete cascade,
    ImageURL  nvarchar(255) not null,
    IsPrimary bit           default 0    -- only one image per asset should be 1
);
go


-- table 5: requests
-- items users need to rent and are shown on the landing page
-- depends on: users, categories
create table Requests 
(
    RequestID   int           primary key identity(1,1),
    RequesterID int           not null foreign key references Users(UserID),
    CategoryID  int           foreign key references Categories(CategoryID),
    Title       nvarchar(150) not null,
    Description nvarchar(1000),
    Area        nvarchar(100),
    City        nvarchar(50),
    StartDate   date          not null,
    EndDate     date          not null,
    MaxBudget   decimal(10,2),
    Status      nvarchar(20)  default 'open'
                check (Status in ('open','fulfilled','closed','expired')),
    CreatedAt   datetime      default getdate(),
    check (EndDate >= StartDate)    -- end date cannot be before start date
);
go


-- table 6: offers
-- lender responses to requests
-- one lender can only make one offer per request
-- depends on: requests, users, assets
create table Offers 
(
    OfferID      int           primary key identity(1,1),
    RequestID    int           not null foreign key references Requests(RequestID),
    LenderID     int           not null foreign key references Users(UserID),
    AssetID      int           foreign key references Assets(AssetID),  -- lender may have no listing/offering
    OfferedPrice decimal(10,2) not null check (OfferedPrice >= 0),
    Message      nvarchar(500),
    Status       nvarchar(20)  default 'pending'
                 check (Status in ('pending','accepted','declined')),
    CreatedAt    datetime      default getdate(),
    unique (RequestID, LenderID)    -- prevents duplicate offers from the same lender
);
go


-- table 7: bookings
-- confirmed rental bookings
-- depends on: assets, offers, users
create table Bookings 
(
    BookingID         int           primary key identity(1,1),
    AssetID           int           foreign key references Assets(AssetID),
    OfferID           int           foreign key references Offers(OfferID),
    RenterID          int           not null foreign key references Users(UserID),
    LenderID          int           not null foreign key references Users(UserID),
    StartDate         date          not null,
    EndDate           date          not null,
    TotalPrice        decimal(10,2) not null check (TotalPrice >= 0),
    Status            nvarchar(20)  default 'pending'
                      check (Status in ('pending','confirmed','ongoing',
                             'returned','completed','cancelled')),
    PaymentScreenshot nvarchar(255),
    IsPaid            bit           default 0,
    CreatedAt         datetime      default getdate(),
    check (EndDate >= StartDate)
);
go


-- table 8: availability
-- blocked dates per asset to prevent double booking
-- cascade: deleting an asset clears its blocked dates too
-- depends on: assets
create table Availability 
(
    AvailabilityID int  primary key identity(1,1),
    AssetID        int  not null
                   foreign key references Assets(AssetID) on delete cascade,
    BlockedDate    date not null,
    unique (AssetID, BlockedDate)   -- same date cannot be blocked twice for one asset
);
go


-- table 9: wallets
-- one wallet per user for dummy in-app payments
-- depends on: users
create table Wallets
(
    WalletID  int           primary key identity(1,1),
    UserID    int           not null unique foreign key references Users(UserID),
    Balance   decimal(10,2) default 0 check (Balance >= 0),   -- balance cannot go negative
    UpdatedAt datetime      default getdate()
);
go


-- table 10: transactions
-- every wallet movement: payments, holds, refunds, releases
-- depends on: bookings, wallets
create table Transactions 
(
    TransactionID int           primary key identity(1,1),
    BookingID     int           not null foreign key references Bookings(BookingID),
    FromWalletID  int           foreign key references Wallets(WalletID),
    ToWalletID    int           foreign key references Wallets(WalletID),
    Amount        decimal(10,2) not null check (Amount > 0),   -- amount must be positive
    Type          nvarchar(20)  not null
                  check (Type in ('payment','deposit','refund','hold','release')),
    CreatedAt     datetime      default getdate()
);
go


-- table 11: messages
-- chat between users tied to a booking
-- a user cannot message themselves
-- depends on: users, bookings
create table Messages 
(
    MessageID  int            primary key identity(1,1),
    SenderID   int            not null foreign key references Users(UserID),
    ReceiverID int            not null foreign key references Users(UserID),
    BookingID  int            foreign key references Bookings(BookingID),  
    Body       nvarchar(2000) not null,
    IsRead     bit            default 0,
    SentAt     datetime       default getdate(),
    check (SenderID <> ReceiverID)   -- cannot send a message to yourself
);
go


-- table 12: reviews
-- star ratings after a completed booking
-- depends on: bookings, users, assets
create table Reviews 
(
    ReviewID   int          primary key identity(1,1),
    BookingID  int          not null foreign key references Bookings(BookingID),
    ReviewerID int          not null foreign key references Users(UserID),
    RevieweeID int          not null foreign key references Users(UserID),
    AssetID    int          foreign key references Assets(AssetID),
    Rating     tinyint      not null check (Rating between 1 and 5),
    Comment    nvarchar(500),
    CreatedAt  datetime     default getdate(),
    unique (BookingID, ReviewerID),         -- one review per booking per person
    check (ReviewerID <> RevieweeID)        -- cant review yourself
);
go


-- table 13: notifications
-- email alerts for all key events
-- depends on: users
create table Notifications
(
    NotificationID int           primary key identity(1,1),
    UserID         int           not null foreign key references Users(UserID),
    Title          nvarchar(100) not null,
    Message        nvarchar(300) not null,
    Type           nvarchar(20)  not null
                   check (Type in ('offer','booking','message',
                          'review','payment','admin','system')),
    IsRead         bit           default 0,
    CreatedAt      datetime      default getdate()
);
go


-- table 14: wishlist
-- assets saved by renters for later
-- depends on: users, assets
create table Wishlist 
(
    WishlistID int      primary key identity(1,1),
    UserID     int      not null foreign key references Users(UserID),
    AssetID    int      not null foreign key references Assets(AssetID),
    AddedAt    datetime default getdate(),
    unique (UserID, AssetID)    -- cannot save the same asset twice
);
go


-- dummy data
-- inserted in dependency order i.e. parents before children

-- categories first since assets and requests reference them
insert into Categories (Name, Description) values
('Electronics',    'Cameras, laptops, phones, gadgets'),
('Party Supplies', 'Decorations, lights, tables, chairs'),
('Vehicles',       'Cars, bikes, rickshaws'),
('Tools',          'Drills, hammers, power tools'),
('Property',       'Farmhouses, halls, event spaces'),
('Sports',         'Gear, equipment, outdoor items'),
('Clothing',       'Formal wear, costumes, traditional dress');
go

-- users second since almost every table references userid
-- passwords shown as placeholders bcrypt hashes these in the real app
insert into Users (FullName, Email, Password, Phone, City, Area, CNIC, IsVerified, IsEmailVerified, Role) values
('Yousuf','yousuf@email.com','hashed_pw_1', '03001234567', 'Lahore', 'DHA Phase 5', '3520112345671', 1, 1, 'user'),
('Dua','dua@email.com', 'hashed_pw_2', '03211234567', 'Lahore', 'Gulberg III',  '3520298765432', 1, 1, 'user'),
('Khushbakht', 'khushbakht@email.com', 'hashed_pw_3', '03451234567', 'Lahore', 'Model Town', '3520387654321', 0, 1, 'user'),
('Noor', 'noor@email.com', 'hashed_pw_4', '03331234567', 'Lahore', 'Johar Town', '3520476543210', 1, 1, 'user'),
('Sara Khan', 'sara@email.com',  'hashed_pw_5', '03121234567', 'Lahore', 'Bahria Town', '3520565432109', 0, 0, 'user'),
('Ahmed Raza', 'ahmed@email.com',  'hashed_pw_6', '03041234567', 'Lahore', 'Cantt', '3520654321098', 1, 1, 'user'),
('Admin User', 'admin@udhaari.com', 'hashed_pw_7', '03001111111', 'Lahore', 'FAST-NU', '3520743210987', 1, 1, 'admin');
go

-- one wallet per user
insert into Wallets (UserID, Balance) values
(1, 15000.00),
(2,  8000.00),
(3,  5000.00),
(4, 12000.00),
(5,  3000.00),
(6, 20000.00),
(7,     0.00);
go

-- assets depend on users and categories
insert into Assets (OwnerID, CategoryID, Title, Description, PricePerDay, Deposit, City, Area) values
(1, 1, 'Canon EOS M50 Camera',  'Great for events. Comes with 2 lenses and a bag.',  1500.00,  5000.00, 'Lahore', 'DHA Phase 5'),
(2, 2, 'Birthday Party Decoration Set', 'Balloons, banners, fairy lights for 20 people.', 800.00,  2000.00, 'Lahore', 'Gulberg III'),
(6, 3, 'Honda CD 70 Motorcycle',  'Well maintained 2022 model. Full tank provided.',  600.00,  3000.00, 'Lahore', 'Cantt'),
(4, 4, 'Bosch Power Drill',   'Heavy duty drill with full set of bits.',   400.00,  1500.00, 'Lahore', 'Johar Town'),
(1, 6, 'Cricket Kit - Full Set',  'Bat, pads, gloves, helmet and ball included.',  700.00,  2500.00, 'Lahore', 'DHA Phase 5'),
(6, 5, 'Farmhouse - 1 Kanal', 'Lawn, kitchen, 3 rooms. Up to 50 guests.', 15000.00, 30000.00, 'Lahore', 'Bedian Road');
go

-- one primary image and one extra image per asset where applicable
insert into AssetImages (AssetID, ImageURL, IsPrimary) values
(1, '/uploads/canon_main.jpg',      1),
(1, '/uploads/canon_lens.jpg',      0),
(2, '/uploads/decor_main.jpg',      1),
(3, '/uploads/honda_main.jpg',      1),
(4, '/uploads/drill_main.jpg',      1),
(5, '/uploads/cricket_main.jpg',    1),
(6, '/uploads/farmhouse_main.jpg',  1),
(6, '/uploads/farmhouse_lawn.jpg',  0);
go

insert into Requests (RequesterID, CategoryID, Title, Description, Area, City, StartDate, EndDate, MaxBudget) values
(3, 1, 'Need a DSLR Camera for 2 days', 'For a wedding shoot. Must include lenses.',    'Model Town',  'Lahore', '2026-03-15', '2026-03-16', 3000.00),
(5, 2, 'Looking for party decoration items', 'Birthday party for 30 people.',  'Bahria Town', 'Lahore', '2026-03-20', '2026-03-20', 1500.00),
(3, 3, 'Need a bike for 3 days',  'Short trip. Any well-maintained bike.', 'Model Town',  'Lahore', '2026-03-18', '2026-03-20', 2000.00),
(2, 4, 'Drill needed for weekend project', 'Simple home renovation, one day only.', 'Gulberg III', 'Lahore', '2026-03-22', '2026-03-22',  500.00),
(5, 6, 'Cricket kit for a gully match', 'Need full kit for 1 day. 6 players.', 'Bahria Town', 'Lahore', '2026-03-19', '2026-03-19', 1000.00);
go

-- assetid is null for offer 2 that lender has no formal listing 
insert into Offers (RequestID, LenderID, AssetID, OfferedPrice, Message) values
(1, 1,    1, 1500.00, 'Canon EOS M50 available on your dates. Comes with 2 lenses.'),
(1, 6, null, 1200.00, 'I have a Nikon D3500. Can deliver to Model Town.'),
(2, 2,    2,  800.00, 'Full decoration set perfect for 30 people.'),
(3, 6,    3,  600.00, 'Honda CD70 available. Full tank included.'),
(4, 4,    4,  400.00, 'Bosch drill available. Can drop off at your location.'),
(5, 1,    5,  700.00, 'Full cricket kit available. Can meet at Model Town.');
go

insert into Bookings (AssetID, OfferID, RenterID, LenderID, StartDate, EndDate, TotalPrice, Status, IsPaid) values
(1, 1, 3, 1, '2026-03-15', '2026-03-16', 3000.00, 'completed', 1),
(2, 3, 5, 2, '2026-03-20', '2026-03-20',  800.00, 'confirmed', 1),
(3, 4, 3, 6, '2026-03-18', '2026-03-20', 1800.00, 'ongoing',   1),
(4, 5, 2, 4, '2026-03-22', '2026-03-22',  400.00, 'pending',   0),
(5, 6, 5, 1, '2026-03-19', '2026-03-19',  700.00, 'confirmed', 1);
go

insert into Availability (AssetID, BlockedDate) values
(1, '2026-03-15'),
(1, '2026-03-16'),
(3, '2026-03-18'),
(3, '2026-03-19'),
(3, '2026-03-20'),
(5, '2026-03-19');
go

-- fromwalletid = payer, towalletid = receiver
insert into Transactions (BookingID, FromWalletID, ToWalletID, Amount, Type) values
(1, 3, 1, 3000.00, 'payment'),
(2, 5, 2,  800.00, 'hold'),
(3, 3, 6, 1800.00, 'payment'),
(5, 5, 1,  700.00, 'hold');
go

insert into Messages (SenderID, ReceiverID, BookingID, Body) values
(3, 1, 1,    'Hi, can we meet at DHA Y block on Saturday morning?'),
(1, 3, 1,    'Sure, 10am works. I will bring the camera bag too.'),
(3, 1, 1,    'Perfect, see you then!'),
(5, 2, 2,    'Should I pick up the decorations from your place?'),
(2, 5, 2,    'Yes please, come after 5pm on the 20th.'),
(7, 3, null, 'Your account has been reviewed and verified. Welcome to Udhaari!');
go

insert into Reviews (BookingID, ReviewerID, RevieweeID, AssetID, Rating, Comment) values
(1, 3, 1, 1, 5, 'Camera was in perfect condition. Very helpful and punctual.'),
(1, 1, 3, 1, 4, 'Took great care of the camera and returned it on time.');
go

insert into Notifications (UserID, Title, Message, Type) values
(1, 'New Offer on Your Request',  'Someone made an offer on your request for a DSLR Camera.', 'offer'),
(3, 'Offer Accepted',  'Your offer for Canon EOS M50 has been accepted!',  'offer'),
(3, 'Booking Confirmed','Your booking for Canon EOS M50 is confirmed.', 'booking'),
(5, 'New Message',      'Dua sent you a message about your decoration booking.','message'),
(3, 'Account Verified', 'Your account has been verified by the admin.', 'admin'),
(2, 'Payment Received', 'Payment of Rs. 800 received for decoration booking.', 'payment');
go

insert into Wishlist (UserID, AssetID) values
(3, 6),
(5, 1),
(2, 3),
(3, 5);
go

-----------------------------------------------------------
-- select queries

-- all open requests for the landing page request board
-- includes requester name, category, and offer count per request

select
    r.RequestID,
    r.Title,
    r.Description,
    r.Area,
    r.City,
    r.StartDate,
    r.EndDate,
    r.MaxBudget,
    r.CreatedAt,
    u.FullName   as RequesterName,
    u.IsVerified,
    c.Name       as Category,
    (select count(*) from Offers o where o.RequestID = r.RequestID) as OfferCount
from Requests r
join Users      u on r.RequesterID = u.UserID
join Categories c on r.CategoryID  = c.CategoryID
where r.Status = 'open'
order by r.CreatedAt desc;
go


-- ------------------------------------------------------------
-- all active asset listings for the bazaar page
-- coalesce returns 0 if the owner has no reviews yet
-- ------------------------------------------------------------
select
    a.AssetID,
    a.Title,
    a.PricePerDay,
    a.City,
    a.Area,
    c.Name       as Category,
    u.FullName   as OwnerName,
    u.IsVerified,
    img.ImageURL as PrimaryImage,
    coalesce(avg(cast(rv.Rating as float)), 0) as OwnerRating
from Assets a
join Users           u   on a.OwnerID    = u.UserID
join Categories      c   on a.CategoryID = c.CategoryID
left join AssetImages img on img.AssetID  = a.AssetID and img.IsPrimary = 1
left join Reviews    rv  on rv.RevieweeID = u.UserID
where a.IsActive = 1
group by
    a.AssetID, a.Title, a.PricePerDay, a.City, a.Area,
    c.Name, u.FullName, u.IsVerified, img.ImageURL
order by a.CreatedAt desc;
go


-- ------------------------------------------------------------
-- keyword search on requests
-- searches both title and description
select
    r.RequestID,
    r.Title,
    r.Description,
    r.MaxBudget,
    r.StartDate,
    r.EndDate,
    u.FullName as RequesterName
from Requests r
join Users u on r.RequesterID = u.UserID
where r.Status = 'open'
  and (r.Title like '%camera%' or r.Description like '%camera%');
go


-- ------------------------------------------------------------
-- q4: filter bazaar by category, city, and price range
select
    a.AssetID,
    a.Title,
    a.PricePerDay,
    a.City,
    c.Name     as Category,
    u.FullName as OwnerName
from Assets a
join Users      u on a.OwnerID    = u.UserID
join Categories c on a.CategoryID = c.CategoryID
where a.IsActive    = 1
  and a.CategoryID  = 1
  and a.City        = 'Lahore'
  and a.PricePerDay between 500 and 2000;
go


-- ------------------------------------------------------------
-- q5: all offers for a request, sorted by lender rating
select
    o.OfferID,
    o.OfferedPrice,
    o.Message,
    o.Status,
    u.FullName  as LenderName,
    u.IsVerified,
    coalesce(avg(cast(rv.Rating as float)), 0) as LenderRating
from Offers o
join Users        u  on o.LenderID    = u.UserID
left join Reviews rv on rv.RevieweeID = u.UserID
where o.RequestID = 1
group by
    o.OfferID, o.OfferedPrice, o.Message, o.Status,
    u.FullName, u.IsVerified
order by LenderRating desc;
go


-- ------------------------------------------------------------
-- q6: booking history for a renter
select
    b.BookingID,
    a.Title    as AssetTitle,
    b.StartDate,
    b.EndDate,
    b.TotalPrice,
    b.Status,
    b.IsPaid,
    u.FullName as LenderName
from Bookings b
join Assets a on b.AssetID  = a.AssetID
join Users  u on b.LenderID = u.UserID
where b.RenterID = 3
order by b.CreatedAt desc;
go


-- ------------------------------------------------------------
-- q7: earnings per asset for an owner | completed bookings only
select
    a.Title            as AssetTitle,
    count(b.BookingID) as TotalBookings,
    sum(b.TotalPrice)  as TotalEarnings
from Bookings b
join Assets a on b.AssetID = a.AssetID
where b.LenderID = 1
  and b.Status   = 'completed'
group by a.AssetID, a.Title
order by TotalEarnings desc;
go


-- ------------------------------------------------------------
-- q8: all messages in a booking conversation (oldest first)
select
    m.MessageID,
    m.Body,
    m.SentAt,
    m.IsRead,
    s.FullName as SenderName
from Messages m
join Users s on m.SenderID = s.UserID
where m.BookingID = 1
order by m.SentAt asc;
go


-- ------------------------------------------------------------
-- q9: all reviews received by a user---
select
    rv.Rating,
    rv.Comment,
    rv.CreatedAt,
    u.FullName as ReviewerName,
    a.Title    as AssetName
from Reviews rv
join Users       u on rv.ReviewerID = u.UserID
left join Assets a on rv.AssetID    = a.AssetID
where rv.RevieweeID = 1
order by rv.CreatedAt desc;
go


-- ------------------------------------------------------------
-- q10: average star rating for a user
select
    avg(cast(Rating as float)) as AverageRating,
    count(*)                   as TotalReviews
from Reviews
where RevieweeID = 1;
go


-- ------------------------------------------------------------
-- q11: wallet balance for a user
select
    u.FullName,
    w.Balance
from Wallets w
join Users u on w.UserID = u.UserID
where w.UserID = 3;
go


-- ------------------------------------------------------------
-- q12: availability check before booking
-- if this returns any rows the asset is not free on those dates
-- if it returns no rows the asset is available
select BlockedDate
from Availability
where AssetID     = 1
  and BlockedDate between '2026-03-15' and '2026-03-16';
go


-- ------------------------------------------------------------
-- q13: admin dashboard summary , all stats in one row
select
    (select count(*)        from Users    where Role     = 'user')      as TotalUsers,
    (select count(*)        from Assets   where IsActive = 1)           as ActiveListings,
    (select count(*)        from Requests where Status   = 'open')      as OpenRequests,
    (select count(*)        from Bookings where Status   = 'completed') as CompletedBookings,
    (select sum(TotalPrice) from Bookings where Status   = 'completed') as TotalRevenue;
go


---------------------------------------------------------
-- section 5: update queries

-- ------------------------------------------------------------
-- accept one offer and decline all other offers on that request
-- the second update uses <> to exclude the accepted offer

update Offers
set Status = 'accepted'
where OfferID = 1
  and Status  = 'pending';    --  do not re-accept an already accepted offer
go

update Offers
set Status = 'declined'
where RequestID = 1
  and OfferID  <> 1
  and Status    = 'pending';  -- only decline offers still in pending state
go


-- ------------------------------------------------------------
-- booking status transitions through the lifecycle
-- each step checks the current status to prevent invalid jumps
-- e.g. cannot go from pending directly to completed

-- lender confirms the booking
update Bookings
set Status = 'confirmed'
where BookingID = 4
  and LenderID  = 4            -- only the lender of this booking can confirm it
  and Status    = 'pending';   -- only confirm if currently pending
go

-- item has been handed over, rental period begins
update Bookings
set Status = 'ongoing'
where BookingID = 4
  and Status    = 'confirmed'; -- can only go ongoing from confirmed
go

-- item returned and rental period complete
update Bookings
set Status = 'completed'
where BookingID = 4
  and Status    = 'ongoing';   -- can only complete from ongoing
go


-- ------------------------------------------------------------
-- owner marks payment as received
-- lenderid check ensures only the correct lender can do this
update Bookings
set IsPaid = 1
where BookingID = 4
  and LenderID  = 4    -- only this booking's lender can confirm payment
  and IsPaid    = 0;   -- skip if already marked paid
go


-- ------------------------------------------------------------
--  mark all unread notifications as read for a user
-- the isread = 0 check avoids a pointless full-table write
update Notifications
set IsRead = 1
where UserID = 3
  and IsRead = 0;   --only update notifications that are actually unread
go


-- ------------------------------------------------------------
-- mark unread messages as read for a user in a conversation
-- receiverid check ensures users cannot mark others' messages as read

update Messages
set IsRead = 1
where BookingID  = 1
  and ReceiverID = 3   -- only mark messages where this user is the receiver
  and IsRead     = 0;  -- eskip messages already read
go


-- ------------------------------------------------------------
-- owner deactivates their own listing
-- ownerid check prevents one user from hiding another's listing
-- ------------------------------------------------------------
update Assets
set IsActive = 0
where AssetID  = 1
  and OwnerID  = 1 
  and IsActive = 1;
go


-- ------------------------------------------------------------
-- admin bans a user
-- cannot ban another admin, cannot ban someone already banned
-- ------------------------------------------------------------
update Users
set IsBanned = 1
where UserID   = 5
  and IsBanned = 0    
  and Role     = 'user'; 
  
go


-- ------------------------------------------------------------
--  admin verifies a user
-- ------------------------------------------------------------
update Users
set IsVerified = 1
where UserID     = 3
  and IsVerified = 0;  
go


-- ------------------------------------------------------------
-- wallet deduction and credit for a booking payment
-- the balance >= amount check prevents the wallet going negative
-- ------------------------------------------------------------
update Wallets
set Balance   = Balance - 800.00,
    UpdatedAt = getdate()
where UserID  = 5
  and Balance >= 800.00;   -- only deduct if the user actually has enough balance
go

update Wallets
set Balance   = Balance + 800.00,
    UpdatedAt = getdate()
where UserID  = 2;
go


--insert queries

-- ------------------------------------------------------------
-- block dates after a booking is confirmed
-- the unique constraint on availability automatically prevents
-- inserting a duplicate blocked date for the same asset
-- ------------------------------------------------------------
insert into Availability (AssetID, BlockedDate)
values (4, '2026-03-22');
go


-- ============================================================
-- section 7: delete queries
-- all deletes use ownership and status checks so users
-- cannot accidentally or maliciously delete the wrong data
-- ============================================================


-- ------------------------------------------------------------
-- q24: renter cancels their own pending booking
-- cannot cancel a confirmed, ongoing, or completed booking
-- ------------------------------------------------------------
delete from Bookings
where BookingID = 4
  and RenterID  = 2          -- edge case: renter can only cancel their own booking
  and Status    = 'pending'; -- edge case: cannot cancel after lender has already confirmed
go


-- ------------------------------------------------------------
-- q25: remove an asset from a user's wishlist
-- userid check ensures users can only remove from their own wishlist
-- ------------------------------------------------------------
delete from Wishlist
where UserID  = 3
  and AssetID = 6;   -- edge case: both userid and assetid required — cannot delete blindly
go


-- ------------------------------------------------------------
-- q26: requester deletes their own open request
-- cannot delete a fulfilled request because an offer was accepted
-- ------------------------------------------------------------
delete from Requests
where RequestID   = 5
  and RequesterID = 5                    -- edge case: only the creator can delete their request
  and Status      not in ('fulfilled'); -- edge case: cannot delete after an offer was accepted
go


-- ------------------------------------------------------------
-- q27: admin removes an inappropriate asset listing
-- cascade automatically deletes all assetimages and availability
-- records linked to this asset -— no manual cleanup needed
-- ------------------------------------------------------------
delete from Assets
where AssetID = 6;
go