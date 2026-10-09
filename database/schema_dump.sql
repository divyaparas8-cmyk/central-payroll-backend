CREATE TABLE `appointments` (
  `id` varchar(36) NOT NULL,
  `pet_id` varchar(36) DEFAULT NULL,
  `doctor_id` varchar(36) DEFAULT NULL,
  `appointment_date` date NOT NULL,
  `appointment_time` time NOT NULL,
  `appointment_type` enum('Clinic Visit','Home Visit') NOT NULL,
  `status` enum('Pending','Confirmed','Completed','Cancelled') DEFAULT 'Pending',
  `notes` text DEFAULT NULL,
  `reminder_sent` tinyint(1) DEFAULT 0,
  `next_reminder_date` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `clinic_id` varchar(36) DEFAULT 'clinic-1',
  PRIMARY KEY (`id`),
  KEY `pet_id` (`pet_id`),
  KEY `doctor_id` (`doctor_id`),
  KEY `fk_appointments_clinic` (`clinic_id`),
  CONSTRAINT `appointments_ibfk_1` FOREIGN KEY (`pet_id`) REFERENCES `pets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `appointments_ibfk_2` FOREIGN KEY (`doctor_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_appointments_clinic` FOREIGN KEY (`clinic_id`) REFERENCES `clinics` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE `assistance_tasks` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `doctor_id` varchar(100) DEFAULT NULL,
  `doctor_name` varchar(100) NOT NULL,
  `patient_id` varchar(100) DEFAULT NULL,
  `patient_name` varchar(100) NOT NULL,
  `task_type` enum('Surgery Prep','Lab Test','Treatment','Emergency') DEFAULT 'Treatment',
  `priority` enum('Critical','High','Medium','Low') DEFAULT 'Medium',
  `scheduled_time` varchar(50) DEFAULT 'ASAP',
  `status` enum('Pending','In Progress','Completed') DEFAULT 'Pending',
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `clinic_id` varchar(36) DEFAULT 'clinic-1',
  PRIMARY KEY (`id`),
  KEY `fk_tasks_clinic` (`clinic_id`),
  CONSTRAINT `fk_tasks_clinic` FOREIGN KEY (`clinic_id`) REFERENCES `clinics` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE `attendance` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) DEFAULT NULL,
  `attendance_date` date NOT NULL,
  `check_in` time DEFAULT NULL,
  `check_out` time DEFAULT NULL,
  `working_hours` decimal(5,2) DEFAULT NULL,
  `status` enum('Present','Absent','Leave','Half Day') NOT NULL,
  `clinic_id` varchar(36) DEFAULT 'clinic-1',
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `fk_attendance_clinic` (`clinic_id`),
  CONSTRAINT `attendance_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_attendance_clinic` FOREIGN KEY (`clinic_id`) REFERENCES `clinics` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE `audit_logs` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) DEFAULT NULL,
  `clinic_id` varchar(36) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `entity` varchar(100) NOT NULL,
  `entity_id` varchar(36) DEFAULT NULL,
  `method` varchar(10) DEFAULT NULL,
  `endpoint` varchar(255) DEFAULT NULL,
  `status_code` int(11) DEFAULT NULL,
  `response_time_ms` int(11) DEFAULT NULL,
  `status` varchar(20) DEFAULT 'SUCCESS',
  `old_values` text DEFAULT NULL,
  `new_values` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `idx_audit_clinic_created` (`clinic_id`,`created_at`),
  KEY `idx_audit_status` (`status`),
  KEY `idx_audit_response_time` (`response_time_ms`),
  CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `audit_logs_ibfk_2` FOREIGN KEY (`clinic_id`) REFERENCES `clinics` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE `clinic_settings` (
  `clinic_id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(255) NOT NULL,
  `address` text NOT NULL,
  `primaryThemeColor` varchar(50) NOT NULL,
  `logo` varchar(255) DEFAULT NULL,
  `autoEmail` tinyint(1) DEFAULT 1,
  `reminderTime` varchar(10) DEFAULT '24h',
  `currency` varchar(10) DEFAULT 'USD',
  `currency_symbol` varchar(10) DEFAULT '$',
  PRIMARY KEY (`clinic_id`),
  CONSTRAINT `clinic_settings_ibfk_1` FOREIGN KEY (`clinic_id`) REFERENCES `clinics` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE `clinical_encounters` (
  `id` varchar(36) NOT NULL,
  `pet_id` varchar(36) DEFAULT NULL,
  `doctor_id` varchar(36) DEFAULT NULL,
  `encounter_date` date NOT NULL,
  `complaint` varchar(255) DEFAULT NULL,
  `duration` varchar(100) DEFAULT NULL,
  `symptoms` text DEFAULT NULL,
  `diagnosis` text DEFAULT NULL,
  `treatment` text DEFAULT NULL,
  `follow_up` varchar(255) DEFAULT NULL,
  `clinic_id` varchar(36) DEFAULT 'clinic-1',
  PRIMARY KEY (`id`),
  KEY `pet_id` (`pet_id`),
  KEY `doctor_id` (`doctor_id`),
  KEY `fk_encounters_clinic` (`clinic_id`),
  CONSTRAINT `clinical_encounters_ibfk_1` FOREIGN KEY (`pet_id`) REFERENCES `pets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `clinical_encounters_ibfk_2` FOREIGN KEY (`doctor_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_encounters_clinic` FOREIGN KEY (`clinic_id`) REFERENCES `clinics` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE `clinics` (
  `id` varchar(36) NOT NULL,
  `clinic_name` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `status` enum('TRIAL','ACTIVE','SUSPENDED','EXPIRED','INACTIVE') DEFAULT 'ACTIVE',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE `database_backups` (
  `id` varchar(36) NOT NULL,
  `filename` varchar(255) NOT NULL,
  `file_size_kb` int(11) DEFAULT 0,
  `tables_count` int(11) DEFAULT 0,
  `total_rows` int(11) DEFAULT 0,
  `backup_type` enum('MANUAL','AUTOMATED_DAILY','EMAIL_REPORT','SCHEDULED_WEEKLY') DEFAULT 'MANUAL',
  `storage_location` enum('LOCAL','AWS_S3','CLOUDINARY') DEFAULT 'LOCAL',
  `status` enum('SUCCESS','FAILED') DEFAULT 'SUCCESS',
  `created_by` varchar(255) DEFAULT 'Super Admin',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE `diagnostic_reports` (
  `id` varchar(36) NOT NULL,
  `encounter_id` varchar(36) DEFAULT NULL,
  `report_type` enum('Blood Test','X-Ray','Ultrasound','PDF Report') NOT NULL,
  `file_url` longtext DEFAULT NULL,
  `uploaded_by` varchar(36) DEFAULT NULL,
  `uploaded_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `clinic_id` varchar(36) DEFAULT 'clinic-1',
  `status` varchar(50) DEFAULT 'Pending',
  PRIMARY KEY (`id`),
  KEY `encounter_id` (`encounter_id`),
  KEY `uploaded_by` (`uploaded_by`),
  KEY `fk_reports_clinic` (`clinic_id`),
  CONSTRAINT `diagnostic_reports_ibfk_1` FOREIGN KEY (`encounter_id`) REFERENCES `clinical_encounters` (`id`) ON DELETE CASCADE,
  CONSTRAINT `diagnostic_reports_ibfk_2` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_reports_clinic` FOREIGN KEY (`clinic_id`) REFERENCES `clinics` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE `email_reminders` (
  `id` varchar(36) NOT NULL,
  `appointment_id` varchar(36) DEFAULT NULL,
  `recipient_email` varchar(255) NOT NULL,
  `scheduled_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `sent_at` timestamp NULL DEFAULT NULL,
  `status` enum('Pending','Sent','Failed') DEFAULT 'Pending',
  PRIMARY KEY (`id`),
  KEY `appointment_id` (`appointment_id`),
  CONSTRAINT `email_reminders_ibfk_1` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE `home_visits` (
  `id` varchar(36) NOT NULL,
  `appointment_id` varchar(36) DEFAULT NULL,
  `pet_id` varchar(36) DEFAULT NULL,
  `owner_id` varchar(36) DEFAULT NULL,
  `doctor_id` varchar(36) DEFAULT NULL,
  `address` text NOT NULL,
  `travel_fee` decimal(10,2) DEFAULT 0.00,
  `visit_status` enum('Scheduled','In Progress','Completed','Cancelled') DEFAULT 'Scheduled',
  `notes` text DEFAULT NULL,
  `clinic_id` varchar(36) DEFAULT 'clinic-1',
  PRIMARY KEY (`id`),
  KEY `appointment_id` (`appointment_id`),
  KEY `pet_id` (`pet_id`),
  KEY `owner_id` (`owner_id`),
  KEY `doctor_id` (`doctor_id`),
  KEY `fk_home_visits_clinic` (`clinic_id`),
  CONSTRAINT `fk_home_visits_clinic` FOREIGN KEY (`clinic_id`) REFERENCES `clinics` (`id`) ON DELETE CASCADE,
  CONSTRAINT `home_visits_ibfk_1` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `home_visits_ibfk_2` FOREIGN KEY (`pet_id`) REFERENCES `pets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `home_visits_ibfk_3` FOREIGN KEY (`owner_id`) REFERENCES `pet_owners` (`id`) ON DELETE CASCADE,
  CONSTRAINT `home_visits_ibfk_4` FOREIGN KEY (`doctor_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE `hospitalization_cages` (
  `id` varchar(50) NOT NULL,
  `clinic_id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `type` varchar(100) NOT NULL,
  `status` enum('Vacant','Occupied','Cleaning Needed') DEFAULT 'Vacant',
  `pet_id` varchar(36) DEFAULT NULL,
  `reason` text DEFAULT NULL,
  `check_in` varchar(255) DEFAULT NULL,
  `flowsheet` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`flowsheet`)),
  PRIMARY KEY (`id`,`clinic_id`),
  KEY `clinic_id` (`clinic_id`),
  KEY `pet_id` (`pet_id`),
  CONSTRAINT `hospitalization_cages_ibfk_1` FOREIGN KEY (`clinic_id`) REFERENCES `clinics` (`id`) ON DELETE CASCADE,
  CONSTRAINT `hospitalization_cages_ibfk_2` FOREIGN KEY (`pet_id`) REFERENCES `pets` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE `hospitalizations` (
  `id` varchar(36) NOT NULL,
  `clinic_id` varchar(36) NOT NULL,
  `cage_id` varchar(50) NOT NULL,
  `cage_name` varchar(100) NOT NULL,
  `cage_type` varchar(100) NOT NULL,
  `pet_id` varchar(36) DEFAULT NULL,
  `admitted_by` varchar(36) DEFAULT NULL,
  `admission_reason` text NOT NULL,
  `special_instructions` text DEFAULT NULL,
  `check_in` datetime DEFAULT current_timestamp(),
  `check_out` datetime DEFAULT NULL,
  `status` enum('Occupied','Vacant','Cleaning Needed') DEFAULT 'Occupied',
  `flowsheet` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT '{"fed":false,"meds":false,"walk":false,"eveningFed":false}' CHECK (json_valid(`flowsheet`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `pet_id` (`pet_id`),
  KEY `admitted_by` (`admitted_by`),
  CONSTRAINT `hospitalizations_ibfk_1` FOREIGN KEY (`pet_id`) REFERENCES `pets` (`id`) ON DELETE SET NULL,
  CONSTRAINT `hospitalizations_ibfk_2` FOREIGN KEY (`admitted_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE `inventory` (
  `id` varchar(36) NOT NULL,
  `sku` varchar(100) NOT NULL,
  `name` varchar(255) NOT NULL,
  `category` enum('Accessories & Toys','Hygiene Items','Food & Snacks','Vitamins & Supplements','Medicine','Service') NOT NULL,
  `supplier` varchar(255) DEFAULT NULL,
  `quantity` int(11) DEFAULT 0,
  `low_stock_threshold` int(11) DEFAULT 5,
  `cost_price` decimal(10,2) DEFAULT NULL,
  `selling_price` decimal(10,2) NOT NULL,
  `is_taxable` tinyint(1) DEFAULT 1,
  `expiry_date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `clinic_id` varchar(36) DEFAULT 'clinic-1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `sku` (`sku`),
  KEY `fk_inventory_clinic` (`clinic_id`),
  CONSTRAINT `fk_inventory_clinic` FOREIGN KEY (`clinic_id`) REFERENCES `clinics` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE `invoice_line_items` (
  `id` varchar(36) NOT NULL,
  `invoice_id` varchar(36) DEFAULT NULL,
  `inventory_id` varchar(36) DEFAULT NULL,
  `quantity` int(11) NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `total` decimal(10,2) NOT NULL,
  `clinic_id` varchar(36) DEFAULT 'clinic-1',
  PRIMARY KEY (`id`),
  KEY `invoice_id` (`invoice_id`),
  KEY `inventory_id` (`inventory_id`),
  KEY `fk_invoice_items_clinic` (`clinic_id`),
  CONSTRAINT `fk_invoice_items_clinic` FOREIGN KEY (`clinic_id`) REFERENCES `clinics` (`id`) ON DELETE CASCADE,
  CONSTRAINT `invoice_line_items_ibfk_1` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE,
  CONSTRAINT `invoice_line_items_ibfk_2` FOREIGN KEY (`inventory_id`) REFERENCES `inventory` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE `invoices` (
  `id` varchar(36) NOT NULL,
  `owner_id` varchar(36) DEFAULT NULL,
  `pet_id` varchar(36) DEFAULT NULL,
  `doctor_id` varchar(36) DEFAULT NULL,
  `encounter_id` varchar(36) DEFAULT NULL,
  `home_visit_id` varchar(36) DEFAULT NULL,
  `invoice_date` date NOT NULL,
  `subtotal` decimal(10,2) NOT NULL,
  `tax_amount` decimal(10,2) DEFAULT 0.00,
  `discount_amount` decimal(10,2) DEFAULT 0.00,
  `grand_total` decimal(10,2) NOT NULL,
  `status` enum('Paid','Pending','Cancelled') DEFAULT 'Pending',
  `clinic_id` varchar(36) DEFAULT 'clinic-1',
  PRIMARY KEY (`id`),
  KEY `owner_id` (`owner_id`),
  KEY `pet_id` (`pet_id`),
  KEY `doctor_id` (`doctor_id`),
  KEY `encounter_id` (`encounter_id`),
  KEY `home_visit_id` (`home_visit_id`),
  KEY `fk_invoices_clinic` (`clinic_id`),
  CONSTRAINT `fk_invoices_clinic` FOREIGN KEY (`clinic_id`) REFERENCES `clinics` (`id`) ON DELETE CASCADE,
  CONSTRAINT `invoices_ibfk_1` FOREIGN KEY (`owner_id`) REFERENCES `pet_owners` (`id`) ON DELETE SET NULL,
  CONSTRAINT `invoices_ibfk_2` FOREIGN KEY (`pet_id`) REFERENCES `pets` (`id`) ON DELETE SET NULL,
  CONSTRAINT `invoices_ibfk_3` FOREIGN KEY (`doctor_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `invoices_ibfk_4` FOREIGN KEY (`encounter_id`) REFERENCES `clinical_encounters` (`id`) ON DELETE SET NULL,
  CONSTRAINT `invoices_ibfk_5` FOREIGN KEY (`home_visit_id`) REFERENCES `home_visits` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE `notification_logs` (
  `id` varchar(36) NOT NULL,
  `clinic_id` varchar(36) DEFAULT NULL,
  `channel` varchar(20) NOT NULL,
  `recipient_name` varchar(255) DEFAULT NULL,
  `recipient_contact` varchar(255) NOT NULL,
  `template_type` varchar(100) NOT NULL,
  `message_content` text NOT NULL,
  `status` varchar(50) DEFAULT 'Sent',
  `gateway_response` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_clinic` (`clinic_id`),
  KEY `idx_channel` (`channel`),
  KEY `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `notification_templates` (
  `id` varchar(36) NOT NULL,
  `clinic_id` varchar(36) DEFAULT NULL,
  `template_type` varchar(100) NOT NULL,
  `channel` varchar(20) NOT NULL,
  `title` varchar(255) NOT NULL,
  `subject` varchar(255) DEFAULT NULL,
  `body_template` text NOT NULL,
  `is_active` tinyint(4) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_template_lookup` (`clinic_id`,`template_type`,`channel`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `notifications` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `type` enum('Inventory','Appointment','Attendance','System') NOT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `clinic_id` varchar(36) DEFAULT 'clinic-1',
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `fk_notifications_clinic` (`clinic_id`),
  CONSTRAINT `fk_notifications_clinic` FOREIGN KEY (`clinic_id`) REFERENCES `clinics` (`id`) ON DELETE CASCADE,
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE `pet_owners` (
  `id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `nic` varchar(50) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `telephone` varchar(20) DEFAULT NULL,
  `mobile` varchar(20) NOT NULL,
  `address` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `clinic_id` varchar(36) DEFAULT 'clinic-1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `nic` (`nic`),
  KEY `fk_owners_clinic` (`clinic_id`),
  CONSTRAINT `fk_owners_clinic` FOREIGN KEY (`clinic_id`) REFERENCES `clinics` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE `pets` (
  `id` varchar(36) NOT NULL,
  `owner_id` varchar(36) DEFAULT NULL,
  `microchip_number` varchar(100) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `species` varchar(100) DEFAULT NULL,
  `breed` varchar(100) DEFAULT NULL,
  `gender` enum('Male','Female') DEFAULT NULL,
  `age` varchar(50) DEFAULT NULL,
  `weight` decimal(5,2) DEFAULT NULL,
  `previous_medical_history` text DEFAULT NULL,
  `last_vaccination` date DEFAULT NULL,
  `last_deworming` date DEFAULT NULL,
  `photo_url` longtext DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `clinic_id` varchar(36) DEFAULT 'clinic-1',
  `neutered_status` varchar(10) DEFAULT 'No',
  PRIMARY KEY (`id`),
  KEY `owner_id` (`owner_id`),
  KEY `fk_pets_clinic` (`clinic_id`),
  CONSTRAINT `fk_pets_clinic` FOREIGN KEY (`clinic_id`) REFERENCES `clinics` (`id`) ON DELETE CASCADE,
  CONSTRAINT `pets_ibfk_1` FOREIGN KEY (`owner_id`) REFERENCES `pet_owners` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE `prescriptions` (
  `id` varchar(36) NOT NULL,
  `encounter_id` varchar(36) DEFAULT NULL,
  `medicine_name` varchar(255) NOT NULL,
  `dosage` varchar(100) DEFAULT NULL,
  `frequency` varchar(100) DEFAULT NULL,
  `duration` varchar(100) DEFAULT NULL,
  `instructions` text DEFAULT NULL,
  `clinic_id` varchar(36) DEFAULT 'clinic-1',
  `inventory_id` varchar(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `encounter_id` (`encounter_id`),
  KEY `fk_prescriptions_clinic` (`clinic_id`),
  KEY `fk_prescriptions_inventory` (`inventory_id`),
  CONSTRAINT `fk_prescriptions_clinic` FOREIGN KEY (`clinic_id`) REFERENCES `clinics` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_prescriptions_inventory` FOREIGN KEY (`inventory_id`) REFERENCES `inventory` (`id`) ON DELETE SET NULL,
  CONSTRAINT `prescriptions_ibfk_1` FOREIGN KEY (`encounter_id`) REFERENCES `clinical_encounters` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE `report_email_subscriptions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `clinic_id` varchar(64) NOT NULL,
  `email` varchar(255) NOT NULL,
  `frequency` enum('WEEKLY','DISABLED') NOT NULL DEFAULT 'WEEKLY',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_clinic_email` (`clinic_id`,`email`),
  KEY `idx_active` (`is_active`,`frequency`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE `role_permissions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `clinic_id` varchar(100) NOT NULL,
  `role` varchar(50) NOT NULL,
  `menu_id` varchar(50) NOT NULL,
  `is_allowed` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_clinic_role_menu` (`clinic_id`,`role`,`menu_id`)
) ENGINE=InnoDB AUTO_INCREMENT=101 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE `saas_payments` (
  `id` varchar(36) NOT NULL,
  `clinic_admin_id` varchar(36) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `status` enum('Successful','Pending','Failed','Refunded') DEFAULT 'Pending',
  `payment_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `razorpay_order_id` varchar(255) DEFAULT NULL,
  `razorpay_payment_id` varchar(255) DEFAULT NULL,
  `razorpay_signature` varchar(255) DEFAULT NULL,
  `currency` varchar(10) DEFAULT 'INR',
  `invoice_number` varchar(100) DEFAULT NULL,
  `payment_method` varchar(50) DEFAULT NULL,
  `plan_id` varchar(36) DEFAULT NULL,
  `clinic_id` varchar(36) DEFAULT 'clinic-1',
  `stripe_session_id` varchar(255) DEFAULT NULL,
  `stripe_payment_intent` varchar(255) DEFAULT NULL,
  `billing_cycle` varchar(50) DEFAULT 'monthly',
  `subtotal_amount` decimal(10,2) DEFAULT 0.00,
  `tax_amount` decimal(10,2) DEFAULT 0.00,
  `customer_name` varchar(255) DEFAULT NULL,
  `customer_email` varchar(255) DEFAULT NULL,
  `invoice_pdf_url` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `clinic_admin_id` (`clinic_admin_id`),
  KEY `fk_pay_clinic` (`clinic_id`),
  CONSTRAINT `fk_pay_clinic` FOREIGN KEY (`clinic_id`) REFERENCES `clinics` (`id`) ON DELETE CASCADE,
  CONSTRAINT `saas_payments_ibfk_1` FOREIGN KEY (`clinic_admin_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE `saas_plans` (
  `id` varchar(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `duration_days` int(11) NOT NULL,
  `features` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE `saas_subscriptions` (
  `id` varchar(36) NOT NULL,
  `clinic_admin_id` varchar(36) DEFAULT NULL,
  `plan_id` varchar(36) DEFAULT NULL,
  `status` enum('Active','Expired','Cancelled','Trial') DEFAULT 'Trial',
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `razorpay_payment_id` varchar(255) DEFAULT NULL,
  `clinic_id` varchar(36) DEFAULT 'clinic-1',
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `reminder_10d_sent` tinyint(1) NOT NULL DEFAULT 0,
  `expiry_email_sent` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `clinic_admin_id` (`clinic_admin_id`),
  KEY `plan_id` (`plan_id`),
  KEY `fk_sub_clinic` (`clinic_id`),
  CONSTRAINT `fk_sub_clinic` FOREIGN KEY (`clinic_id`) REFERENCES `clinics` (`id`) ON DELETE CASCADE,
  CONSTRAINT `saas_subscriptions_ibfk_1` FOREIGN KEY (`clinic_admin_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `saas_subscriptions_ibfk_2` FOREIGN KEY (`plan_id`) REFERENCES `saas_plans` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE `saas_support_tickets` (
  `id` varchar(50) NOT NULL,
  `clinic_admin_id` varchar(36) DEFAULT NULL,
  `clinic` varchar(255) NOT NULL,
  `adminName` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `priority` varchar(50) NOT NULL,
  `category` varchar(50) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'Open',
  `updated` varchar(100) NOT NULL,
  `messages` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`messages`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE `saas_system_settings` (
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text NOT NULL,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE `scheduled_reports` (
  `id` varchar(64) NOT NULL,
  `clinic_id` varchar(64) NOT NULL,
  `report_type` enum('WEEKLY_7DAY','MANUAL_EMAIL') NOT NULL DEFAULT 'WEEKLY_7DAY',
  `recipient_email` varchar(255) NOT NULL,
  `period_start` date NOT NULL,
  `period_end` date NOT NULL,
  `status` enum('PENDING','SENT','FAILED','RETRYING') NOT NULL DEFAULT 'PENDING',
  `attempt_count` int(11) NOT NULL DEFAULT 0,
  `max_retries` int(11) NOT NULL DEFAULT 3,
  `last_error` text DEFAULT NULL,
  `email_message_id` varchar(255) DEFAULT NULL,
  `report_summary` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`report_summary`)),
  `file_size_kb` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `sent_at` timestamp NULL DEFAULT NULL,
  `next_retry_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_clinic_period` (`clinic_id`,`period_start`,`period_end`),
  KEY `idx_status` (`status`),
  KEY `idx_report_type` (`report_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE `super_admins` (
  `id` varchar(36) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` varchar(50) DEFAULT 'SUPER_ADMIN',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE `system_settings` (
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text DEFAULT NULL,
  `setting_group` varchar(50) DEFAULT 'general',
  `description` varchar(255) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE `treatment_notes` (
  `id` varchar(36) NOT NULL,
  `encounter_id` varchar(36) DEFAULT NULL,
  `user_id` varchar(36) DEFAULT NULL,
  `note_type` enum('observation','medication','vitals') NOT NULL,
  `note_text` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `clinic_id` varchar(36) DEFAULT 'clinic-1',
  PRIMARY KEY (`id`),
  KEY `encounter_id` (`encounter_id`),
  KEY `user_id` (`user_id`),
  KEY `fk_treatment_clinic` (`clinic_id`),
  CONSTRAINT `fk_treatment_clinic` FOREIGN KEY (`clinic_id`) REFERENCES `clinics` (`id`) ON DELETE CASCADE,
  CONSTRAINT `treatment_notes_ibfk_1` FOREIGN KEY (`encounter_id`) REFERENCES `clinical_encounters` (`id`) ON DELETE CASCADE,
  CONSTRAINT `treatment_notes_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE `users` (
  `id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('Admin','Manager','Doctor','Receptionist','Vet Assistant') NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `username` varchar(50) DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `profile_image` longtext DEFAULT NULL,
  `status` enum('Active','Inactive','On Leave','Terminated') DEFAULT 'Active',
  `current_session_token` varchar(255) DEFAULT NULL,
  `last_login_ip` varchar(50) DEFAULT NULL,
  `last_login_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `selected_plan` varchar(20) DEFAULT 'free-trial',
  `trial_expiry_date` date DEFAULT NULL,
  `subscription_status` enum('trial','active','expired') DEFAULT 'trial',
  `clinic_id` varchar(36) DEFAULT 'clinic-1',
  `reset_password_token` varchar(255) DEFAULT NULL,
  `reset_password_expires` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `username` (`username`),
  KEY `fk_users_clinic` (`clinic_id`),
  CONSTRAINT `fk_users_clinic` FOREIGN KEY (`clinic_id`) REFERENCES `clinics` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE `whatsapp_connections` (
  `id` varchar(36) NOT NULL,
  `clinic_id` varchar(100) NOT NULL,
  `phone_number` varchar(30) DEFAULT NULL,
  `status` enum('DISCONNECTED','CONNECTING','QR_READY','AUTHENTICATING','CONNECTED','DISCONNECTING','ERROR') DEFAULT 'DISCONNECTED',
  `session_data` text DEFAULT NULL,
  `qr_code` longtext DEFAULT NULL,
  `last_error` text DEFAULT NULL,
  `connected_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `pairing_code` varchar(30) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `clinic_id` (`clinic_id`),
  KEY `idx_whatsapp_clinic` (`clinic_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

