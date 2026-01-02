<?php
// config.php - إعدادات الاتصال بقاعدة البيانات

$host = 'localhost';
$dbname = 'hospital_db';
$username = 'root';  // عادة root في XAMPP/Laragon
$password = '';      // عادة فارغ في XAMPP/Laragon

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    die("خطأ في الاتصال بقاعدة البيانات: " . $e->getMessage());
}

// بدء الجلسة
session_start();

// دالة للتحقق من اللوجن
function is_logged_in() {
    return isset($_SESSION['user_id']);
}

// دالة للتحقق من الصلاحية
function has_permission($permission) {
    if (!is_logged_in()) return false;
    if ($_SESSION['role'] === 'admin') return true;
    return in_array($permission, $_SESSION['permissions'] ?? []);
}

// إعادة توجيه لو مش مسجل دخول
function require_login() {
    if (!is_logged_in()) {
        header('Location: login.php');
        exit;
    }
}
?>