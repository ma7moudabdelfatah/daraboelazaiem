<?php
require 'config.php';

$message = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username']);
    $password = $_POST['password'];

    $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password'])) {
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['username'] = $user['username'];
        $_SESSION['role'] = $user['role'];
        $_SESSION['permissions'] = json_decode($user['permissions'] ?? '[]', true);
        header('Location: dashboard.php');
        exit;
    } else {
        $message = 'اسم المستخدم أو كلمة المرور غير صحيحة';
    }
}
?>

<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>تسجيل الدخول - مستشفى أبو العزايم</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
<div class="container">
    <div class="header">
        <img src="2.jpg" alt="مستشفى ابوالعزايم">
        <h1>مستشفى ابوالعزايم</h1>
    </div>
    <div class="box">
        <h1>تسجيل الدخول</h1>
        <form method="POST">
            <input type="text" name="username" placeholder="اسم المستخدم" required>
            <input type="password" name="password" placeholder="كلمة المرور" required>
            <button type="submit">دخول</button>
        </form>
        <?php if ($message): ?>
            <p style="color:red; text-align:center;"><?php echo $message; ?></p>
        <?php endif; ?>
    </div>
</div>
</body>
</html>